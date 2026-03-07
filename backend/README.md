# Chainlink Agent — Backend

Express 5 API server handling x402 gateway payments, CRE webhook integrations, and Chainlink Private Token settlement.

## Features

- **x402 Gateway** — HTTP 402 payment flow with on-chain escrow verification
- **CRE Webhooks** — Endpoints consumed by Chainlink CRE workflows for settlement, disputes, and expiry
- **Private Token Client** — Chainlink Private Token API wrapper for shielded merchant payouts
- **AI Dispute Analysis** — LLM-powered dispute resolution triggered by CRE
- **SIWE Auth** — Sign-In With Ethereum with JWT session management
- **Workflow Engine API** — CRUD for merchant automations + CRE execution endpoints

## Tech Stack

- Express 5 + TypeScript
- Prisma ORM + PostgreSQL
- ethers.js (on-chain escrow reads)
- JWT + SIWE authentication
- Chainlink Private Token API (EIP-712 signed requests)

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (or Docker)
- npm

### Install & Run

```bash
npm install
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run dev           # Start dev server (port 3001)
```

### Database (Docker)

```bash
docker run -d --name chainlink-agent-db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=chainlink_agent_db \
  -p 5433:5432 postgres:16
```

### Environment Variables

Create `.env` in the backend root:

```env
# Database
DATABASE_URL=postgresql://admin:password@localhost:5433/chainlink_agent_db

# Auth
JWT_SECRET=your_jwt_secret

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Blockchain
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ESCROW_CONTRACT_ADDRESS=0x...

# Facilitator (settlement + private token)
FACILITATOR_PRIVATE_KEY=your_private_key
FACILITATOR_SHIELDED_ADDRESS=your_shielded_address

# Chainlink Private Token
PRIVATE_TOKEN_API_URL=https://convergence2026-token-api.cldev.cloud
VAULT_ADDRESS=0x...
TOKEN_ADDRESS=0x...
```

### Database Commands

```bash
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Push schema (no migration file)
npm run db:migrate    # Create and apply migration
```

## API Routes

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api/auth` | Mixed | SIWE nonce/verify, JWT, shielded address, private balance, withdraw |
| `/api/resources` | JWT | Merchant CRUD for data resources |
| `/api/explore` | Public | Resource discovery with trust scores |
| `/api/gateway` | Public | x402 payment flow, escrow verification, settlement |
| `/api/disputes` | JWT | AI dispute analysis and resolution |
| `/api/workflows` | JWT | Workflow CRUD, AI generation, activate/pause |
| `/api/cre` | Public | CRE webhook endpoints (15+ endpoints) |

## Chainlink Integration Points

### CRE Webhook Endpoints (`/api/cre`)

Consumed by Chainlink CRE workflows:

- `GET /cre/verify-delivery/:escrowKey` — Verify resource delivery for settlement
- `GET /cre/analyze-dispute/:escrowKey` — Run AI dispute analysis
- `GET /cre/expired-escrows` — List expired escrows for auto-refund
- `POST /cre/settlement-complete` — CRE notifies settlement done, triggers private payout
- `POST /cre/dispute-resolved` — CRE notifies dispute verdict
- `POST /cre/private-settle` — Trigger private token transfer (idempotent)
- `GET /cre/verify-private-transfer/:escrowKey` — Verify private transfer completed
- `GET /cre/active-workflows` — List workflows for CRE execution
- `POST /cre/workflow-action` — Execute workflow actions (update price, toggle resource)

### Private Token Client (`src/clients/privateTokenClient.ts`)

Wraps the Chainlink Private Token API with EIP-712 authentication:

- `generateShieldedAddress()` — Create privacy-preserving merchant addresses
- `privateTransfer()` — Execute private token transfers with hide-sender flag
- `getBalances()` — Query private token balances
- `requestWithdrawal()` — Redeem tokens on-chain

### Private Settlement Service (`src/services/privateSettlementService.ts`)

After on-chain settlement, automatically transfers CLAG tokens from platform treasury to merchant's shielded address. Idempotent — tracks `privateTransferTxId` to prevent duplicates.

## Key Directories

```
backend/
├── src/
│   ├── clients/
│   │   ├── escrowClient.ts          # On-chain escrow reader
│   │   └── privateTokenClient.ts    # Chainlink Private Token API
│   ├── controllers/
│   │   ├── authController.ts        # SIWE + shielded address + balance
│   │   ├── gatewayController.ts     # x402 payment flow
│   │   ├── disputeAIController.ts   # AI dispute analysis
│   │   └── workflowController.ts    # Workflow CRUD + AI generation
│   ├── routes/
│   │   ├── creWebhookRoutes.ts      # CRE workflow endpoints
│   │   ├── gatewayRoutes.ts         # x402 gateway
│   │   └── authRoutes.ts            # Auth + privacy endpoints
│   ├── services/
│   │   └── privateSettlementService.ts  # Private token payouts
│   └── index.ts
└── prisma/
    └── schema.prisma                # User, Resource, Transaction, Workflow
```
