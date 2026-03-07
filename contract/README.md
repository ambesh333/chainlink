# Chainlink Agent — Smart Contracts

Solidity contracts for on-chain escrow and Chainlink CRE report consumption, deployed on Ethereum Sepolia.

## Contracts

| Contract | Purpose |
|----------|---------|
| `EscrowMarketplace.sol` | ETH/ERC-20 escrow with state machine (Created -> Funded -> Disputed -> Settled/Released) |
| `DisputeConsumer.sol` | Receives Chainlink CRE signed reports via Forwarder, calls `finalizeSettlement()` or `resolveDispute()` |
| `ReceiverTemplate.sol` | Abstract Chainlink IReceiver — validates CRE reports and decodes metadata |
| `IReceiver.sol` | Chainlink CRE report receiver interface |
| `IERC165.sol` | Interface support for Chainlink IReceiver compatibility |
| `SimpleToken.sol` | ERC-20 token used with Chainlink Private Token vault |

## Architecture

```
Agent calls requestSettlement() or raiseDispute()
                    |
                    v
         EscrowMarketplace emits event
                    |
                    v
          CRE Workflow (off-chain)
          - Verify delivery / AI analysis
                    |
                    v
          Signs report: { escrowKey, payMerchant }
                    |
                    v
          Chainlink Forwarder
                    |
                    v
          DisputeConsumer.onReport()
            |                   |
            v                   v
     finalizeSettlement()   resolveDispute()
     (pay merchant)         (refund agent)
```

## Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Install

```bash
forge install
```

### Build

```bash
forge build
```

### Test

```bash
forge test
forge test -vvv          # Verbose
forge test --match-test <TestName>  # Single test
```

## Deployment (Sepolia)

### 1. Environment Variables

```bash
export PRIVATE_KEY=your_private_key
export SEPOLIA_RPC_URL=your_rpc_url
```

### 2. Deploy EscrowMarketplace

```bash
forge script script/DeployEscrow.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 3. Deploy DisputeConsumer

Uses Chainlink Forwarder address: `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`

```bash
forge script script/DeployDisputeConsumer.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 4. Register DisputeConsumer as Facilitator

DisputeConsumer must be a facilitator on EscrowMarketplace to call `finalizeSettlement()`:

```bash
cast send $ESCROW_ADDRESS \
  "addFacilitator(address)" \
  $DISPUTE_CONSUMER_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

### 5. Deploy Private Token Contracts (Optional)

```bash
forge script script/DeployPrivateTransfer.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

This deploys SimpleToken + PolicyEngine + Vault for Chainlink Private Token integration.

## Deployment Scripts

| Script | Purpose |
|--------|---------|
| `DeployEscrow.s.sol` | Deploy EscrowMarketplace |
| `DeployDisputeConsumer.s.sol` | Deploy DisputeConsumer with Chainlink Forwarder |
| `DeployPrivateTransfer.s.sol` | All-in-one Private Token setup |
| `01_DeployToken.s.sol` — `07_WithdrawWithTicket.s.sol` | Step-by-step Private Token deployment |

## Chainlink Integration

- **DisputeConsumer.sol** extends `ReceiverTemplate.sol` which implements the Chainlink `IReceiver` interface
- CRE workflows submit signed reports to DisputeConsumer via the Chainlink Forwarder (`0x15fC6ae953E024d975e77382eEeC56A9101f9F88`)
- Reports contain `{ escrowKey, payMerchant }` — decoded in `onReport()` to finalize or refund
- SimpleToken is registered with Chainlink Private Token vault for shielded transfers
