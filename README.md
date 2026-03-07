# Chainlink Agent

A decentralized marketplace where AI agents purchase data resources from merchants using **x402 + on-chain escrow**, with settlement, disputes, and privacy powered entirely by **Chainlink**.

> Built for the Chainlink CRE Hackathon

---

## The Problem

AI agents need to buy data programmatically. Today that means:
- **No trustless payments** — agents pre-pay centralized APIs with zero escrow or refund
- **Zero privacy** — every payment is fully visible on-chain; competitors track spending and suppliers
- **No dispute resolution** — when delivered data is wrong, there is no automated recourse

## The Solution

Chainlink Agent is an end-to-end marketplace with:
- **x402 escrow payments** — HTTP-native payment protocol with on-chain fund locking
- **CRE-automated settlement** — three Chainlink CRE workflows handle settlement verification, AI dispute resolution, and expiry refunds
- **Private payouts** — merchant settlements flow through Chainlink Private Token shielded addresses

---

## Chainlink Integration

### Files That Use Chainlink

#### CRE Workflows (Chainlink Compute Runtime Environment)

| File | Description |
|------|-------------|
| [`cre/settlement-verifier/main.ts`](cre/settlement-verifier/main.ts) | Listens for `SettlementRequested` events, verifies delivery via backend API, submits signed report to DisputeConsumer |
| [`cre/dispute-resolver/main.ts`](cre/dispute-resolver/main.ts) | Listens for `DisputeRaised` events, runs AI analysis via backend, submits verdict report |
| [`cre/expiry-watchdog/main.ts`](cre/expiry-watchdog/main.ts) | Cron (60s) — detects expired escrows, submits refund reports |
| [`cre/workflow-engine/main.ts`](cre/workflow-engine/main.ts) | Cron — executes merchant-defined automation workflows (pricing, availability, notifications) |

#### Smart Contracts (Chainlink CRE Report Receiver)

| File | Description |
|------|-------------|
| [`contract/src/DisputeConsumer.sol`](contract/src/DisputeConsumer.sol) | Receives CRE signed reports via Chainlink Forwarder, calls `finalizeSettlement()` or `resolveDispute()` |
| [`contract/src/ReceiverTemplate.sol`](contract/src/ReceiverTemplate.sol) | Abstract Chainlink IReceiver — validates CRE reports and decodes metadata |
| [`contract/src/IReceiver.sol`](contract/src/IReceiver.sol) | Chainlink CRE report receiver interface |
| [`contract/src/EscrowMarketplace.sol`](contract/src/EscrowMarketplace.sol) | ETH/ERC-20 escrow contract called by DisputeConsumer for settlement finalization |
| [`contract/script/DeployDisputeConsumer.s.sol`](contract/script/DeployDisputeConsumer.s.sol) | Deploys DisputeConsumer with Chainlink Forwarder address |

#### Chainlink Private Token Integration

| File | Description |
|------|-------------|
| [`backend/src/clients/privateTokenClient.ts`](backend/src/clients/privateTokenClient.ts) | Wraps Chainlink Private Token API — shielded address generation, private transfers (hide-sender), EIP-712 auth |
| [`backend/src/services/privateSettlementService.ts`](backend/src/services/privateSettlementService.ts) | Executes private token transfers to merchant shielded addresses after on-chain settlement |
| [`backend/src/routes/creWebhookRoutes.ts`](backend/src/routes/creWebhookRoutes.ts) | Webhook endpoints consumed by CRE workflows — verify delivery, analyze disputes, trigger private settlements |
| [`contract/src/SimpleToken.sol`](contract/src/SimpleToken.sol) | ERC-20 token used with Chainlink Private Token vault |
| [`contract/script/DeployPrivateTransfer.s.sol`](contract/script/DeployPrivateTransfer.s.sol) | Deploys token + PolicyEngine + Vault for Chainlink Private Token setup |

---

### CRE Workflow Details

All four CRE workflows use the `@chainlink/cre-sdk` and follow the same pattern:

```
On-Chain Event or Cron Trigger
        |
        v
  CRE Workflow (off-chain)
        |
        v
  Call Backend API (verify delivery / AI analysis / expired escrows)
        |
        v
  Build & Sign Report: { escrowKey, payMerchant: bool }
        |
        v
  Submit to DisputeConsumer via Chainlink Forwarder
        |
        v
  On-chain finalization (settle or refund)
        |
        v
  Private Token payout to merchant shielded address
```

**Settlement Verifier** — triggered by `SettlementRequested` event. Calls `GET /api/cre/verify-delivery/:escrowKey` to confirm the resource was delivered (checks X-Payment header + on-chain state). If verified, submits `payMerchant: true` report. After on-chain settlement, backend auto-triggers private token transfer to merchant.

**Dispute Resolver** — triggered by `DisputeRaised` event. Calls `GET /api/cre/analyze-dispute/:escrowKey` which runs AI analysis on the resource content vs. dispute context. Submits `payMerchant = verdict` report. If merchant wins, private payout is triggered.

**Expiry Watchdog** — cron every 60 seconds. Calls `GET /api/cre/expired-escrows` to find escrows past their timeout. Submits `payMerchant: false` for each, auto-refunding agents.

**Workflow Engine** — cron-triggered. Polls `GET /api/cre/active-workflows` for merchant-defined automations, fetches resource stats, executes actions (update price, toggle availability, Telegram notifications).

#### Simulation

```bash
cd cre
bun install
bun run simulate:settle   # Settlement verifier
bun run simulate:dispute  # Dispute resolver
bun run simulate:expiry   # Expiry watchdog
bun run simulate:workflow # Workflow engine
bun run simulate:all      # All workflows
```

---

### Private Token Integration

After on-chain escrow settlement, merchant payouts go through a two-phase privacy flow:

```
Phase 1 (Public):   Agent --[ETH deposit]--> EscrowMarketplace --[CRE settles]--> Platform Treasury
Phase 2 (Private):  Treasury --[CLAG transfer]--> Merchant Shielded Address (hide-sender enabled)
```

- **Shielded addresses** — each merchant generates a privacy-preserving address via Chainlink Private Token API
- **Hide-sender** — platform treasury address is never exposed in the private transfer
- **EIP-712 auth** — all Private Token API calls use wallet-signed typed data (no API keys)
- **Idempotent** — the backend tracks `privateTransferTxId` to prevent double payouts

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                AI Agent  /  Next.js Dashboard                    │
│   Explore resources, purchase via x402, build workflows          │
└─────────────────────────────┬────────────────────────────────────┘
                              |
                              v
┌──────────────────────────────────────────────────────────────────┐
│                  Backend API  (Express + Prisma)                  │
│   Auth (SIWE)  |  Gateway (x402)  |  Resources  |  Private Token │
│                         PostgreSQL                               │
└────────┬──────────────────────┬──────────────────────┬───────────┘
         |                      |                      |
         v                      v                      v
┌──────────────────────────────────────────────────────────────────┐
│                    Chainlink CRE Workflows                       │
│   Settlement Verifier | Dispute Resolver | Expiry Watchdog       │
│   Workflow Engine (merchant automations)                         │
└───────────┬──────────────────┬──────────────────────┬────────────┘
            |                  |                      |
            v                  v                      v
┌──────────────────────────────────────────────────────────────────┐
│                      Ethereum Sepolia                            │
│   EscrowMarketplace  <--  DisputeConsumer (CRE reports)          │
│   Chainlink Private Token (shielded addresses + vault)           │
└──────────────────────────────────────────────────────────────────┘
```

## Transaction Lifecycle

1. **Discover** — Agent calls `GET /api/explore` to browse resources with pricing and trust scores
2. **402 Challenge** — Agent hits `GET /api/gateway/resource/:id`, receives HTTP 402 with escrow details
3. **Deposit** — Agent calls `deposit(key)` on EscrowMarketplace, locking ETH on-chain
4. **Access** — Agent retries with `X-Payment` header containing escrow key + tx hash, receives resource
5. **Settle** — Agent calls `requestSettlement(key)` on-chain, notifies `POST /api/gateway/settle`
6. **CRE Finalizes** — Settlement Verifier workflow verifies delivery and submits signed report
7. **Private Payout** — Backend transfers CLAG to merchant's shielded address via Chainlink Private Token

---

## Monorepo Structure

| Directory | Description | Setup |
|-----------|-------------|-------|
| [`frontend/`](frontend/) | Next.js 15 dashboard & marketplace | [Frontend README](frontend/README.md) |
| [`backend/`](backend/) | Express 5 API server, x402 gateway, Private Token client | [Backend README](backend/README.md) |
| [`contract/`](contract/) | Solidity contracts (Foundry) — EscrowMarketplace + DisputeConsumer | [Contract README](contract/README.md) |
| [`cre/`](cre/) | Chainlink CRE workflows — settlement, disputes, expiry, automations | [CRE README](cre/README.md) |

## Quick Start

```bash
# 1. Smart contracts
cd contract && forge build && forge test

# 2. Backend
cd backend && npm install && npm run db:push && npm run dev

# 3. Frontend
cd frontend && npm install && npm run dev

# 4. CRE workflows (simulate)
cd cre && bun install && bun run simulate:all
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TailwindCSS, RainbowKit, wagmi |
| Backend | Express 5, TypeScript, Prisma, PostgreSQL, JWT + SIWE |
| Contracts | Solidity, Foundry, Ethereum Sepolia |
| CRE | @chainlink/cre-sdk, Chainlink Forwarder, DisputeConsumer |
| Privacy | Chainlink Private Token API, EIP-712, Shielded Addresses |
