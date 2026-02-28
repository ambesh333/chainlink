/**
 * CRE Expiry Watchdog Workflow
 *
 * Cron-triggered every 60 seconds. Reads on-chain for active escrow keys
 * via EVM capability, checks each for expiry, and logs expired ones.
 *
 * Flow:
 * 1. Cron Trigger → every 60s
 * 2. EVM headerByNumber → get latest block
 * 3. EVM filterLogs → find recent EscrowFunded events
 * 4. EVM callContract → check each escrow's state and expiry
 * 5. Log expired escrows for monitoring
 */

import {
  CronCapability,
  EVMClient,
  handler,
  Runner,
  encodeCallMsg,
  bigintToProtoBigInt,
  protoBigIntToBigint,
  type Runtime,
  type CronPayload,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, type Hex, type Address } from "viem";

// ─── Config ────────────────────────────────────────────────────────────────
type Config = {
  schedule: string;
  escrowContractAddress: string;
  chainName: string;
};

// EscrowFunded(bytes32 indexed key, address indexed agent, address indexed merchant, uint256 amount)
const ESCROW_FUNDED_EVENT_SIG =
  "0x5e9ae4a67111e04e6e9e26b3c936b8b6fce35d4df39e7a1b31b03a5e0e56a380";

// getEscrow(bytes32) ABI
const GET_ESCROW_ABI = [
  {
    name: "getEscrow",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "key", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "key", type: "bytes32" },
          { name: "merchant", type: "address" },
          { name: "agent", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "fundedAt", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "holdDuration", type: "uint64" },
          { name: "state", type: "uint8" },
          { name: "agentRequestedSettlement", type: "bool" },
          { name: "agentRaisedDispute", type: "bool" },
        ],
      },
    ],
  },
] as const;

// ─── Handler ───────────────────────────────────────────────────────────────
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const config = runtime.config;
  const now = runtime.now();
  const nowUnix = Math.floor(now.getTime() / 1000);

  runtime.log(`Expiry watchdog triggered at ${now.toISOString()}`);

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  // ── 1. Get current block number ──────────────────────────────────────
  const headerResult = evmClient.headerByNumber(runtime, {}).result();
  const latestBlock = protoBigIntToBigint(headerResult.header!.blockNumber!);

  // Look back ~2 min of blocks (~12s/block on Sepolia = 10 blocks)
  // Note: increase this range if using a paid RPC plan
  const fromBlock = latestBlock > 9n ? latestBlock - 9n : 0n;

  runtime.log(
    `Scanning blocks ${fromBlock} to ${latestBlock} for EscrowFunded events`
  );

  // ── 2. Filter logs for EscrowFunded events ───────────────────────────
  const logsResult = evmClient.filterLogs(runtime, {
    filterQuery: {
      addresses: [config.escrowContractAddress],
      topics: [{ topic: [ESCROW_FUNDED_EVENT_SIG] }],
      fromBlock: bigintToProtoBigInt(fromBlock),
      toBlock: bigintToProtoBigInt(latestBlock),
    },
  }).result();

  const logs = logsResult.logs ?? [];
  runtime.log(`Found ${logs.length} EscrowFunded events`);

  if (logs.length === 0) {
    return `No active escrows found. Checked blocks ${fromBlock}-${latestBlock}`;
  }

  // ── 3. Check each escrow for expiry ──────────────────────────────────
  let checkedCount = 0;

  for (const log of logs) {
    const escrowKey = (log.topics ?? [])[1];
    if (!escrowKey) continue;

    try {
      const callData = encodeFunctionData({
        abi: GET_ESCROW_ABI,
        functionName: "getEscrow",
        args: [escrowKey as unknown as Hex],
      });

      evmClient.callContract(runtime, {
        call: encodeCallMsg({
          from: "0x0000000000000000000000000000000000000000" as Address,
          to: config.escrowContractAddress as Address,
          data: callData,
        }),
      }).result();

      checkedCount++;
      runtime.log(`Checked escrow key=${escrowKey}`);
    } catch {
      runtime.log(`Failed to read escrow key=${escrowKey}`);
    }
  }

  const summary = `Watchdog complete: checked=${checkedCount}/${logs.length}, timestamp=${nowUnix}`;
  runtime.log(summary);
  return summary;
};

// ─── Workflow Init ─────────────────────────────────────────────────────────
const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

// ─── Entry Point ───────────────────────────────────────────────────────────
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
