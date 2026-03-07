# Expiry Watchdog — CRE Workflow

Chainlink CRE workflow that runs on a cron schedule to detect expired escrows and automatically refund agents. If an escrow's hold duration has passed without settlement or dispute, this workflow releases funds back to the agent.

## Flow

```
Cron trigger (every 60s)
         │
         ▼
┌─────────────────────────────┐
│  CRE Expiry Watchdog        │
│  wakes up                   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Confidential HTTP call to  │
│  backend expired-escrows    │
│  GET /api/cre/expired-escrows│
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Backend checks all PENDING │
│  transactions against       │
│  on-chain state + expiry    │
│  Returns expired keys       │
└─────────────┬───────────────┘
              │
         ┌────┴────┐
         │         │
    has expired   none found
    escrows        │
         │         ▼
         │     ┌──────────┐
         │     │  Done —   │
         │     │  sleep 60s│
         │     └──────────┘
         ▼
┌─────────────────────────────┐
│  For each expired escrow:   │
│                             │
│  1. Encode report           │
│     (key, false)            │
│     payMerchant = false     │
│     → refund agent          │
│                             │
│  2. runtime.report()        │
│     Sign with ECDSA +       │
│     keccak256               │
│                             │
│  3. writeReport() to        │
│     DisputeConsumer on      │
│     Sepolia                 │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  DisputeConsumer calls      │
│  finalizeSettlement(key,    │
│  false) on EscrowMarketplace│
│  → agent gets refunded      │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Notify backend:            │
│  POST /api/cre/             │
│  expiry-refunded            │
│  → DB updated to REFUNDED   │
└─────────────────────────────┘
```

## When Does an Escrow Expire?

An escrow is considered expired when **all** of these are true:
- On-chain state is `Funded` or `SettlementRequested` (still active)
- `escrow.expiry <= block.timestamp` (hold duration has passed)
- No dispute has been raised

This covers two scenarios:
1. **Agent never confirmed receipt** — escrow stays `Funded` past expiry
2. **Settlement requested but CRE never finalized** — edge case safety net

## Report Payload

ABI-encoded as `(bytes32, bool)`:
- `bytes32 key` — the escrow key
- `bool payMerchant` — always `false` (refund agent on expiry)

## Config (`config.staging.json`)

| Field                    | Description                                      |
|--------------------------|--------------------------------------------------|
| `schedule`               | Cron expression (`*/60 * * * * *` = every 60s)   |
| `escrowContractAddress`  | EscrowMarketplace contract address               |
| `disputeConsumerAddress` | On-chain consumer that receives the signed report |
| `backendUrl`             | Backend API base URL for expired escrow lookup    |
| `chainName`              | Target chain (`ethereum-testnet-sepolia`)          |
| `gasLimit`               | Gas limit for the writeReport transaction          |

## Backend Endpoint

**`GET /api/cre/expired-escrows`**

Returns:
```json
{
  "expired": [
    { "escrowKey": "0x...", "transactionId": "...", "agentId": "0x..." }
  ],
  "count": 1,
  "checkedAt": "2026-02-28T12:00:00.000Z"
}
```

The endpoint checks all `PENDING` transactions in the database, reads each escrow's on-chain state and expiry, and returns only those that have expired in an active state.

## Files

```
expiry-watchdog/
├── main.ts                  # Workflow logic
├── config.staging.json      # Staging config (Sepolia)
├── config.production.json   # Production config
├── workflow.yaml            # CRE workflow settings
└── README.md
```

## Running

```bash
cd cre
bun install
bun run simulate:expiry
```

## Relationship to Other Workflows

| Workflow              | Trigger                    | Action                        |
|-----------------------|----------------------------|-------------------------------|
| **settlement-verifier** | `SettlementRequested` event | Verify delivery → pay merchant |
| **dispute-resolver**    | `DisputeRaised` event       | AI analysis → resolve dispute  |
| **expiry-watchdog**     | Cron (every 60s)            | Check expiry → refund agent    |

The expiry watchdog acts as a safety net — if neither settlement nor dispute happens before the hold duration expires, the agent is automatically refunded.

## Backend Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cre/expired-escrows` | Find escrows past their expiry in active states |
| POST | `/api/cre/expiry-refunded` | Notify backend that agent was refunded, update DB |

## CRE SDK Features Used

| Feature | Usage |
|---------|-------|
| `CronCapability` | Trigger workflow every 60 seconds |
| `ConfidentialHTTPClient` | Call backend APIs for expired escrow lookup and notification |
| `runtime.report()` | Sign refund report with ECDSA + keccak256 |
| `EVMClient.writeReport()` | Submit signed report to DisputeConsumer on Sepolia |
