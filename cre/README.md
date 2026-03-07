# Chainlink Agent — CRE Workflows

Four Chainlink CRE (Compute Runtime Environment) workflows that automate settlement, disputes, expiry, and merchant operations.

## Workflows

### 1. Settlement Verifier (`settlement-verifier/main.ts`)

- **Trigger:** `SettlementRequested` event from EscrowMarketplace
- **Action:** Calls backend `GET /api/cre/verify-delivery/:escrowKey` to confirm resource delivery
- **Report:** `{ escrowKey, payMerchant: true }` submitted to DisputeConsumer via Chainlink Forwarder
- **Result:** Merchant paid on-chain, then private token payout to merchant's shielded address

### 2. Dispute Resolver (`dispute-resolver/main.ts`)

- **Trigger:** `DisputeRaised` event from EscrowMarketplace
- **Action:** Calls backend `GET /api/cre/analyze-dispute/:escrowKey` which runs AI analysis
- **Report:** `{ escrowKey, payMerchant: <verdict> }` submitted to DisputeConsumer
- **Result:** Merchant paid (+ private payout) or agent refunded based on AI verdict

### 3. Expiry Watchdog (`expiry-watchdog/main.ts`)

- **Trigger:** Cron schedule (every 60 seconds)
- **Action:** Calls backend `GET /api/cre/expired-escrows` to find timed-out escrows
- **Report:** `{ escrowKey, payMerchant: false }` for each expired escrow
- **Result:** Agents auto-refunded, funds never locked indefinitely

### 4. Workflow Engine (`workflow-engine/main.ts`)

- **Trigger:** Cron schedule
- **Action:** Polls `GET /api/cre/active-workflows`, fetches resource stats, evaluates conditions
- **Executes:** `POST /api/cre/workflow-action` — update prices, toggle resources, send Telegram notifications
- **Result:** Merchant automations run on schedule without manual intervention

## CRE SDK Usage

All workflows use `@chainlink/cre-sdk` capabilities:

```typescript
import { CronCapability, EVMClient, ConfidentialHTTPClient } from "@chainlink/cre-sdk";

// Event-triggered workflows use EVMClient to listen for on-chain events
// Cron-triggered workflows use CronCapability for scheduled execution
// All workflows use ConfidentialHTTPClient for backend API calls
// Reports are submitted via runtime.report() to Chainlink Forwarder
```

## Setup

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Install

```bash
bun install
```

This runs `cre-setup` automatically via postinstall.

### Simulate

```bash
bun run simulate:settle    # Settlement verifier
bun run simulate:dispute   # Dispute resolver
bun run simulate:expiry    # Expiry watchdog
bun run simulate:workflow  # Workflow engine
bun run simulate:all       # All workflows
```

Simulations use the CRE CLI to run workflows locally with mocked triggers and verify the full flow (event detection -> API call -> report submission).

### Environment

CRE workflows read secrets from `secrets.yaml`:

- `BACKEND_URL` — Backend API base URL
- `SEPOLIA_RPC_URL` — Ethereum Sepolia RPC endpoint

Contract addresses and Chainlink Forwarder address are configured in `project.yaml`.

## How CRE Connects Everything

```
┌─────────────────────┐     ┌──────────────────────┐
│  Ethereum Sepolia    │     │   Backend API         │
│  EscrowMarketplace   │     │   /api/cre/*          │
│  (events)            │     │   (verify, analyze)   │
└─────────┬───────────┘     └──────────┬───────────┘
          |                            |
          v                            v
┌──────────────────────────────────────────────────┐
│              CRE Workflows (this directory)       │
│                                                   │
│  1. Listen for on-chain events (or cron)          │
│  2. Call backend APIs for verification/analysis   │
│  3. Build report: { escrowKey, payMerchant }      │
│  4. Sign and submit via Chainlink Forwarder       │
└──────────────────────────┬───────────────────────┘
                           |
                           v
┌──────────────────────────────────────────────────┐
│  DisputeConsumer.sol (on-chain)                   │
│  Decodes report -> finalizeSettlement() or        │
│                    resolveDispute()                │
└──────────────────────────────────────────────────┘
```

## Directory Structure

```
cre/
├── settlement-verifier/
│   └── main.ts           # Settlement verification workflow
├── dispute-resolver/
│   └── main.ts           # AI dispute resolution workflow
├── expiry-watchdog/
│   └── main.ts           # Expired escrow auto-refund workflow
├── workflow-engine/
│   └── main.ts           # Merchant automation engine
├── scripts/
│   └── simulate.sh       # Simulation runner
├── project.yaml          # CRE project config (contracts, forwarder)
├── secrets.yaml          # Runtime secrets (URLs, keys)
├── package.json          # Dependencies (@chainlink/cre-sdk)
└── tsconfig.json
```
