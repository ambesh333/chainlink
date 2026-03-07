# Dispute Resolver — CRE Workflow

Decentralized AI-powered dispute resolution for the Chainlink Agent Marketplace, running on the Chainlink Runtime Environment (CRE).

## How It Works

### The Problem

When an agent buys a data resource from a merchant, the payment is held in an on-chain escrow (`EscrowMarketplace.sol`). If the agent believes the resource is broken, misrepresented, or not as described, they can raise a dispute. Someone needs to decide: **does the merchant keep the money, or does the agent get a refund?**

A centralized backend making this decision is a single point of failure and requires trust. CRE makes this trustless.

### Dual-LLM Architecture

This workflow uses **two independent LLMs** (OpenAI GPT-4o-mini + Google Gemini 2.0 Flash) for dispute analysis. This runs on top of the **Decentralized Oracle Network (DON)**, where multiple nodes execute the workflow independently and reach consensus.

```
                    DON Node 1                    DON Node 2                    DON Node N
                   ┌──────────┐                  ┌──────────┐                  ┌──────────┐
                   │ OpenAI ──┤                  │ OpenAI ──┤                  │ OpenAI ──┤
                   │          ├─► verdict         │          ├─► verdict         │          ├─► verdict
                   │ Gemini ──┤                  │ Gemini ──┤                  │ Gemini ──┤
                   └──────────┘                  └──────────┘                  └──────────┘
                        │                             │                             │
                        └─────────────┬───────────────┘                             │
                                      └──────────────── DON Consensus ──────────────┘
                                                          │
                                                    Signed Report
                                                          │
                                                   On-chain Settlement
```

**Why two LLMs?**
- No single AI provider can manipulate the outcome
- If one LLM is down (rate limits, outages), the other provides a fallback
- When both succeed and agree, confidence is highest
- When they disagree, the higher-confidence verdict wins

**Fallback logic:**
1. Both succeed + agree → use consensus verdict (highest trust)
2. Both succeed + disagree → use the verdict with higher confidence score
3. Only OpenAI succeeds → use OpenAI verdict
4. Only Gemini succeeds → use Gemini verdict
5. Both fail → default to buyer protection (refund agent)

### End-to-End Flow

```
Agent calls raiseDispute(key) on EscrowMarketplace
         |
         v
EscrowMarketplace emits DisputeRaised(key, agent, merchant, amount)
         |
         v
CRE DON nodes detect the event (EVM Log Trigger)
         |
         v
CRE Workflow runs on EVERY DON node independently:
  1. Read escrow details on-chain (getEscrow)
  2. Fetch resource metadata from backend API (Confidential HTTP)
  3. Call OpenAI GPT-4o-mini for dispute analysis (Confidential HTTP)
  4. Call Google Gemini 2.0 Flash for dispute analysis (Confidential HTTP)
  5. Resolve verdict: consensus > higher confidence > fallback > default
         |
         v
DON nodes reach consensus on the final verdict
         |
         v
CRE builds a signed report: (escrowKey, payMerchant)
         |
         v
KeystoneForwarder delivers report to DisputeConsumer contract
         |
         v
DisputeConsumer.report() decodes (escrowKey, payMerchant)
  -> calls EscrowMarketplace.finalizeSettlement(key, payMerchant)
         |
         v
Escrow funds sent to merchant (if payMerchant=true) or refunded to agent (if false)
         |
         v
If payMerchant=true:
  POST /api/cre/private-settle → CLAG to merchant's shielded address
  GET /api/cre/verify-private-transfer/:key → confirm private payout
```

### Two Contracts Working Together

#### EscrowMarketplace.sol

The main escrow contract. Holds funds and manages state transitions:

- `createEscrow()` — merchant/facilitator creates escrow terms
- `deposit()` — agent deposits ETH/ERC20, emits `EscrowFunded`
- `raiseDispute()` — agent raises dispute, emits `DisputeRaised` **(this triggers the CRE workflow)**
- `finalizeSettlement(key, payMerchant)` — facilitator-only function that pays out funds
- `getEscrow(key)` — read escrow state (used by CRE to get on-chain context)

#### DisputeConsumer.sol

The CRE report receiver. Acts as the bridge between CRE and the escrow:

- `report(reportData)` — called by KeystoneForwarder with the CRE-signed payload
  - Decodes `(bytes32 escrowKey, bool payMerchant)` from the report
  - Prevents double-resolution (`creResolved` mapping)
  - Calls `finalizeSettlement()` on EscrowMarketplace
  - Emits `ReportProcessed` event
- `getResolution(key)` — check if/how an escrow was resolved by CRE
- `setForwarder(addr, bool)` — owner adds/removes allowed KeystoneForwarder addresses

**Key requirement**: DisputeConsumer must be registered as a **facilitator** on EscrowMarketplace (`addFacilitator(disputeConsumerAddress)`), otherwise `finalizeSettlement()` will revert.

### What the CRE Workflow Does (main.ts)

The workflow handler `onDisputeRaised` executes these steps:

1. **Read on-chain escrow** — `evmClient.callContract()` calls `getEscrow(key)` to verify the dispute is real and get escrow details

2. **Fetch dispute context** — `confidentialHttp.sendRequest()` calls `GET /api/cre/dispute-context/:escrowKey` on the backend to get:
   - Resource title, type, description
   - The agent's dispute reason

3. **Dual-LLM analysis** — two independent AI calls via `ConfidentialHTTPClient`:
   - **OpenAI GPT-4o-mini** — via `https://api.openai.com/v1/chat/completions`
   - **Google Gemini 2.0 Flash** — via `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
   - Both receive identical system prompt + dispute context
   - Both return: `{isValid, reasoning, confidence, payMerchant}`
   - Either can fail independently without breaking the workflow

4. **Verdict resolution** — merge dual-LLM results:
   - Both agree → consensus (strongest signal)
   - Disagree → higher confidence wins
   - One fails → use the other
   - Both fail → default to refund agent (buyer protection)

5. **Build and write report** — `runtime.report()` + `evmClient.writeReport()` encodes `(escrowKey, payMerchant)` and submits to `DisputeConsumer`

6. **Notify backend** — `POST /api/cre/dispute-resolved` updates DB state

7. **Private payout** (if merchant wins) — `POST /api/cre/private-settle` triggers Chainlink Private Token transfer to merchant's shielded address, then `GET /api/cre/verify-private-transfer/:key` confirms completion

### Why Confidential HTTP?

CRE workflows run inside a Decentralized Oracle Network (DON). The `ConfidentialHTTPClient` ensures:
- API keys (OpenAI, Gemini) are stored in the Vault DON and never exposed on-chain
- HTTP requests are encrypted between DON nodes
- Multiple nodes independently call both AIs and reach consensus — no single node can manipulate the result

### Trust Layers

| Layer | What it provides |
|---|---|
| **DON consensus** | N nodes run independently, must agree on the result |
| **Dual LLM** | Two different AI providers analyze the same dispute |
| **Confidential HTTP** | API keys encrypted, requests private within DON |
| **On-chain finality** | DisputeConsumer enforces single-resolution, immutable record |

## Configuration

### config.staging.json

```json
{
  "escrowContractAddress": "0x4290721c3a000A23b77B12E971A51ae3a2a4CB06",
  "disputeConsumerAddress": "0x0000000000000000000000000000000000000000",
  "backendUrl": "http://localhost:3001/api",
  "chainName": "ethereum-testnet-sepolia"
}
```

- `escrowContractAddress` — deployed EscrowMarketplace on Sepolia
- `disputeConsumerAddress` — deployed DisputeConsumer (update after deployment)
- `backendUrl` — backend API for fetching dispute context

### Secrets (secrets.yaml)

```yaml
secretsNames:
    OPENAI_API_KEY:
        - OPENAI_API_KEY_VALUE
    GEMINI_API_KEY:
        - GEMINI_API_KEY_VALUE
    BACKEND_URL:
        - BACKEND_URL_VALUE
```

For simulation, export env vars:
```bash
export OPENAI_API_KEY_VALUE="sk-proj-..."
export GEMINI_API_KEY_VALUE="AIzaSy..."
export BACKEND_URL_VALUE="http://localhost:3001/api"
```

## Simulation

```bash
cd cre

# Simulate with a real DisputeRaised transaction:
cre workflow simulate ./dispute-resolver \
  -R . -T staging-settings \
  --non-interactive \
  --trigger-index 0 \
  --evm-tx-hash <tx-hash-of-raiseDispute-call> \
  --evm-event-index 0
```

The workflow compiles TypeScript to WebAssembly (via Javy) and runs inside the CRE simulator. Without a real on-chain `DisputeRaised` event, the trigger will fail with "tx receipt not found" — this is expected.

## Deployment Checklist

1. Deploy `EscrowMarketplace` on Sepolia
2. Deploy `DisputeConsumer` with EscrowMarketplace address
3. Call `escrowMarketplace.addFacilitator(disputeConsumerAddress)` — so DisputeConsumer can call `finalizeSettlement`
4. Call `disputeConsumer.setForwarder(keystoneForwarderAddress, true)` — so CRE can call `report()`
5. Update `config.staging.json` with deployed addresses
6. Store OpenAI + Gemini API keys in CRE Vault DON
7. Deploy workflow: `cre workflow deploy ./dispute-resolver -R . -T staging-settings`

## File Structure

```
dispute-resolver/
├── main.ts              # CRE workflow logic (dual-LLM dispute resolution)
├── workflow.yaml        # Workflow settings (name, paths, secrets)
├── config.staging.json  # Staging config (contract addresses, URLs)
├── config.production.json
├── package.json         # Dependencies (@chainlink/cre-sdk, viem)
├── tsconfig.json
└── README.md            # This file
```
