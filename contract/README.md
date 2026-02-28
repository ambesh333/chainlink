# Chainlink Agent — Smart Contracts

On-chain escrow and AI-powered dispute resolution contracts for the Chainlink Agent marketplace.

## Architecture

```
User → EscrowMarketplace
          ↓
      DisputeRaised Event
          ↓
   CRE Workflow (AI)
          ↓
   KeystoneForwarder
          ↓
DisputeConsumer (ReceiverTemplate)
          ↓
EscrowMarketplace.finalizeSettlement()
```

### Contracts

| Contract | Purpose |
|---|---|
| `EscrowMarketplace.sol` | ETH/ERC20 escrow with state machine (Created → Funded → Disputed → Settled/Released) |
| `DisputeConsumer.sol` | Receives CRE-signed reports via KeystoneForwarder and calls `finalizeSettlement()` |
| `ReceiverTemplate.sol` | Base contract for Keystone report verification |
| `IERC165.sol` / `IReceiver.sol` | Interfaces for Keystone compatibility |

## Foundry Toolkit

- **Forge** — Build & test
- **Cast** — Contract interaction
- **Anvil** — Local node
- **CRE CLI** — Workflow deployment

## Installation

```shell
forge install
```

## Build Contracts

```shell
forge build
```

## Run Tests

```shell
forge test
```

Optional verbose:

```shell
forge test -vvv
```

## Clean Build

```shell
forge clean
forge build
```

## Local Node (Optional)

```shell
anvil
```

## Deployment Guide (Sepolia)

### 1. Set Environment Variables

```shell
export PRIVATE_KEY=your_private_key
export SEPOLIA_RPC_URL=your_rpc_url
```

### 2. Deploy EscrowMarketplace

```shell
forge script script/DeployEscrow.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

Save the deployed address:

```shell
ESCROW_ADDRESS=0x...
```

### 3. Deploy DisputeConsumer (Simulation Mode)

Use MockForwarder for simulation:

```
0x15fC6ae953E024d975e77382eEeC56A9101f9F88
```

Deploy:

```shell
forge script script/DeployDisputeConsumer.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

### 4. Add DisputeConsumer as Facilitator

> This step is **mandatory** — DisputeConsumer must be a facilitator on EscrowMarketplace to call `finalizeSettlement()`.

```shell
cast send $ESCROW_ADDRESS \
  "addFacilitator(address)" \
  <DISPUTE_CONSUMER_ADDRESS> \
  --private-key $PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

### 5. Verify Facilitator (Optional)

```shell
cast call $ESCROW_ADDRESS \
  "facilitators(address)" \
  <DISPUTE_CONSUMER_ADDRESS> \
  --rpc-url $SEPOLIA_RPC_URL
```

Should return `true`.

## Documentation

- [Foundry Book](https://book.getfoundry.sh/)
- [Chainlink CRE Docs](https://docs.chain.link/)
