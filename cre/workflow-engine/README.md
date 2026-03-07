# Workflow Engine — CRE Workflow

Chainlink CRE meta-workflow that interprets dynamic JSON workflow definitions created by merchants in the dashboard. Users can build unlimited automations without deploying new CRE code.

## How It Works

### The Problem

Merchants need to automate pricing, availability, and notifications for their data resources. Deploying a new CRE workflow for every automation is impractical. The workflow engine solves this by interpreting user-defined workflows at runtime.

### Architecture

```
Cron trigger (every 5 min)
         |
         v
┌─────────────────────────────┐
│  CRE Workflow Engine        │
│  wakes up                   │
└─────────────┬───────────────┘
              |
              v
┌─────────────────────────────┐
│  Fetch active workflows     │
│  GET /api/cre/              │
│  active-workflows           │
│  → JSON workflow definitions│
└─────────────┬───────────────┘
              |
              v
┌─────────────────────────────┐
│  For each workflow:         │
│                             │
│  1. Find start node         │
│  2. BFS traverse graph      │
│  3. Execute each node:      │
│     trigger → data →        │
│     condition → ai →        │
│     action                  │
└─────────────┬───────────────┘
              |
              v
┌─────────────────────────────┐
│  Log execution results      │
│  POST /api/cre/             │
│  workflow-execution         │
└─────────────┬───────────────┘
              |
              v
┌─────────────────────────────┐
│  Write batch audit report   │
│  on-chain via DisputeConsumer│
│  (executed, succeeded, ts)  │
└─────────────────────────────┘
```

## Node Types

The engine supports 5 node types that merchants combine in the visual workflow builder:

### trigger
Passes through — the cron trigger already fired. Marks the start of the workflow graph.

### data — `fetch_stats`
Fetches live resource metrics from the backend.

```
GET /api/cre/resource-stats/:resourceId
→ { currentPrice, accessCount, totalEarnings, settledCount }
```

Stores all values in the execution context for downstream nodes.

### condition — `compare`
Evaluates a metric against a threshold using an operator (`>`, `<`, `>=`, `<=`, `==`).

```
Example: accessCount > 100 → true branch
                            → false branch
```

Condition nodes have two outgoing edges (`true` / `false`), and the engine follows the matching branch.

### ai — `price_analysis`
Calls the backend AI price analysis endpoint with current resource metrics.

```
POST /api/cre/ai-price-analysis
→ { recommendedPrice, changePercent, reasoning, confidence, action }
```

Stores the AI recommendation in context for action nodes. Falls back to holding current price if AI is unavailable.

### action
Executes a side effect. Three action types:

| Block Type | Backend Call | Description |
|------------|-------------|-------------|
| `update_price` | `POST /api/cre/workflow-action` | Update resource price (fixed, percentage, or AI-recommended) |
| `toggle_resource` | `POST /api/cre/workflow-action` | Activate or deactivate a resource |
| `telegram_notify` | `POST /api/cre/workflow-action` | Send a Telegram message with template variables |
| `stop` | — | End the workflow |

## Example Workflow

A merchant creates this workflow in the dashboard:

```
[Cron Trigger] → [Fetch Stats] → [Access > 50?]
                                       |
                              true     |     false
                                |      |        |
                                v      |        v
                        [AI Analysis]  |    [Stop]
                                |      |
                                v      |
                        [Update Price] |
                                |      |
                                v      |
                        [Telegram Notify]
```

The engine traverses this graph, fetching stats, checking the condition, running AI analysis if the condition passes, updating the price, and sending a notification.

## Audit Trail

After executing all active workflows, the engine writes a batch audit report on-chain:

```
ABI-encoded: (uint256 totalExecuted, uint256 totalSucceeded, uint256 timestamp)
```

This is submitted to DisputeConsumer via `runtime.report()` + `EVMClient.writeReport()`, creating an immutable record of workflow executions on Sepolia.

## Backend Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cre/active-workflows` | Fetch all ACTIVE workflow definitions |
| GET | `/api/cre/resource-stats/:resourceId` | Get access count, earnings, current price |
| POST | `/api/cre/workflow-action` | Execute action: `update_price`, `toggle_resource`, `telegram_notify` |
| POST | `/api/cre/workflow-execution` | Log execution result (status, log, steps) |
| POST | `/api/cre/ai-price-analysis` | AI-powered price recommendation |

## CRE SDK Features Used

| Feature | Usage |
|---------|-------|
| `CronCapability` | Trigger engine on schedule |
| `ConfidentialHTTPClient` | All backend API calls (5+ per run) |
| `runtime.report()` | Sign batch audit report with ECDSA + keccak256 |
| `EVMClient.writeReport()` | Submit audit report to DisputeConsumer on Sepolia |
| `runtime.log()` | Step-by-step execution logging |

## Config (`config.staging.json`)

| Field | Description |
|-------|-------------|
| `schedule` | Cron expression for trigger frequency |
| `escrowContractAddress` | EscrowMarketplace contract address |
| `disputeConsumerAddress` | On-chain consumer for audit reports |
| `backendUrl` | Backend API base URL |
| `chainName` | Target chain (`ethereum-testnet-sepolia`) |
| `gasLimit` | Gas limit for writeReport transaction |

## Files

```
workflow-engine/
├── main.ts                  # Meta-workflow logic (interpreter + executor)
├── config.staging.json      # Staging config (Sepolia)
├── config.production.json   # Production config
├── workflow.yaml            # CRE workflow settings
└── README.md
```

## Running

```bash
cd cre
bun install
bun run simulate:workflow
```

## Relationship to Other Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| **settlement-verifier** | `SettlementRequested` event | Verify delivery, pay merchant, private payout |
| **dispute-resolver** | `DisputeRaised` event | AI analysis, resolve dispute, private payout |
| **expiry-watchdog** | Cron (every 60s) | Check expiry, refund agent |
| **workflow-engine** | Cron (every 5 min) | Execute merchant automations, on-chain audit |

The workflow engine is unique among the four CRE workflows — it doesn't interact with escrow state directly. Instead, it runs merchant-defined business logic (pricing, availability, notifications) and writes audit trails on-chain.
