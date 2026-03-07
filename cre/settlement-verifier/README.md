# Settlement Verifier — CRE Workflow

Chainlink CRE (Compute Runtime Environment) workflow that automatically verifies resource delivery and finalizes escrow settlement on-chain. This replaces the old backend polling listener (`settlementListener.ts`) with a decentralized, trustless approach.

## Flow

```
Agent clicks "Confirm Receipt"
         │
         ▼
┌─────────────────────────────┐
│  Frontend calls             │
│  requestSettlement(key)     │
│  on EscrowMarketplace.sol   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  SettlementRequested event  │
│  emitted on-chain           │
│  (bytes32 key, address agent)│
└─────────────┬───────────────┘
              │  EVM Log Trigger
              ▼
┌─────────────────────────────┐
│  CRE Settlement Verifier    │
│  picks up the event         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Confidential HTTP call to  │
│  backend verify-delivery    │
│  GET /api/cre/verify-delivery/{escrowKey}
└─────────────┬───────────────┘
              │
         ┌────┴────┐
         │         │
    delivered?   not delivered
         │         │
         ▼         ▼
┌──────────────┐  ┌──────────────────┐
│ Encode report│  │ Skip — let expiry│
│ (key, true)  │  │ watchdog handle  │
│ via CRE SDK  │  └──────────────────┘
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│  runtime.report()           │
│  Sign payload with ECDSA    │
│  + keccak256 hashing        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  writeReport() to           │
│  DisputeConsumer contract   │
│  on Sepolia                 │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  DisputeConsumer calls      │
│  finalizeSettlement(key,    │
│  true) on EscrowMarketplace │
│  → merchant gets paid       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Notify backend:            │
│  POST /api/cre/             │
│  settlement-complete        │
│  → DB updated to SETTLED    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Trigger private payout:    │
│  POST /api/cre/             │
│  private-settle             │
│  → CLAG sent to merchant's  │
│    shielded address          │
│    (hide-sender enabled)    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Verify private transfer:   │
│  GET /api/cre/              │
│  verify-private-transfer/   │
│  {escrowKey}                │
└─────────────────────────────┘
```

## Event Signature

```
SettlementRequested(bytes32 indexed key, address indexed agent)
Topic0: 0x96186b8375a7f1e5d882fb44d498e7e41e518e3ae009fd917965bffc28b3b65e
```

## Report Payload

ABI-encoded as `(bytes32, bool)`:
- `bytes32 key` — the escrow key
- `bool payMerchant` — always `true` for verified settlements

## Config (`config.staging.json`)

| Field                    | Description                                     |
|--------------------------|-------------------------------------------------|
| `escrowContractAddress`  | EscrowMarketplace contract to watch for events   |
| `disputeConsumerAddress` | On-chain consumer that receives the signed report|
| `backendUrl`             | Backend API base URL for delivery verification   |
| `chainName`              | Target chain (`ethereum-testnet-sepolia`)         |
| `gasLimit`               | Gas limit for the writeReport transaction         |

## Files

```
settlement-verifier/
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
bun run simulate:settle
```

## Why CRE?

1. **Decentralized** — settlement verification runs on Chainlink's compute network, not a single backend server
2. **Trustless** — the signed report is verified on-chain by the DisputeConsumer contract
3. **Delivery check** — the workflow verifies actual resource delivery before paying the merchant, rather than blindly finalizing
4. **Private payout** — after on-chain settlement, the workflow triggers a Chainlink Private Token transfer to the merchant's shielded address

## Backend Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cre/verify-delivery/:escrowKey` | Confirm resource was delivered (checks X-Payment header + on-chain state) |
| POST | `/api/cre/settlement-complete` | Notify backend that on-chain settlement is done, update DB |
| POST | `/api/cre/private-settle` | Trigger private token transfer to merchant's shielded address |
| GET | `/api/cre/verify-private-transfer/:escrowKey` | Verify the private transfer completed |

## CRE SDK Features Used

| Feature | Usage |
|---------|-------|
| `EVMClient.logTrigger()` | Listen for `SettlementRequested` events on EscrowMarketplace |
| `ConfidentialHTTPClient` | Call backend APIs for delivery verification and private settlement |
| `runtime.report()` | Sign report payload with ECDSA + keccak256 |
| `EVMClient.writeReport()` | Submit signed report to DisputeConsumer on Sepolia |
