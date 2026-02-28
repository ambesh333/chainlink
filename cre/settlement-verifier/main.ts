/**
 * CRE Settlement Verifier Workflow
 *
 * Triggered by SettlementRequested(bytes32 key, address agent) event.
 *
 * Flow:
 * 1. EVM Log Trigger → decode SettlementRequested event
 * 2. Confidential HTTP → verify resource delivery via backend API
 * 3. If verified → Report + WriteReport → finalize settlement (pay merchant)
 * 4. If not verified → skip (let expiry watchdog handle it)
 */

import {
  EVMClient,
  ConfidentialHTTPClient,
  handler,
  Runner,
  prepareReportRequest,
  type Runtime,
  type EVMLog,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, type Hex } from "viem";

// ─── Config ────────────────────────────────────────────────────────────────
type Config = {
  escrowContractAddress: string;
  disputeConsumerAddress: string;
  backendUrl: string;
  chainName: string;
};

// SettlementRequested(bytes32 indexed key, address indexed agent)
const SETTLEMENT_REQUESTED_EVENT_SIG =
  "0x96186b8375a7f1e5d882fb44d498e7e41e518e3ae009fd917965bffc28b3b65e";

// ─── Handler ───────────────────────────────────────────────────────────────
const onSettlementRequested = (
  runtime: Runtime<Config>,
  triggerOutput: EVMLog
): string => {
  const config = runtime.config;
  const topics = triggerOutput.topics ?? [];
  const escrowKey = topics[1] ?? "0x";

  runtime.log(`SettlementRequested: key=${escrowKey}`);

  // ── 1. Verify resource delivery via backend ──────────────────────────
  const confidentialHttp = new ConfidentialHTTPClient();

  const verifyResponse = confidentialHttp.sendRequest(runtime, {
    request: {
      url: `${config.backendUrl}/cre/verify-delivery/${escrowKey}`,
      method: "GET",
      multiHeaders: {
        "Content-Type": { values: ["application/json"] },
      },
    },
  }).result();

  let delivered = false;

  try {
    const bodyStr = new TextDecoder().decode(verifyResponse.body);
    const result = JSON.parse(bodyStr);
    delivered = result.delivered === true;
    runtime.log(`Delivery verification: delivered=${delivered}`);
  } catch {
    runtime.log("Failed to parse delivery verification response");
  }

  if (!delivered) {
    runtime.log(
      `Delivery not verified for key=${escrowKey}. Skipping auto-settlement.`
    );
    return `Skipped: ${escrowKey} — delivery not verified`;
  }

  // ── 2. Build report: finalize settlement paying merchant ─────────────
  const reportPayload = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bool" }],
    [escrowKey as unknown as Hex, true] // payMerchant = true
  );

  const reportRequest = prepareReportRequest(reportPayload);
  const report = runtime.report(reportRequest).result();

  // ── 3. Write report to DisputeConsumer ───────────────────────────────
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  evmClient.writeReport(runtime, {
    receiver: config.disputeConsumerAddress,
    report,
  }).result();

  runtime.log(`Settlement auto-finalized: key=${escrowKey}, payMerchant=true`);
  return `Settled: ${escrowKey} → payMerchant=true`;
};

// ─── Workflow Init ─────────────────────────────────────────────────────────
const initWorkflow = (config: Config) => {
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  const settlementTrigger = evmClient.logTrigger({
    addresses: [config.escrowContractAddress],
    topics: [{ values: [SETTLEMENT_REQUESTED_EVENT_SIG] }],
  });

  return [handler(settlementTrigger, onSettlementRequested)];
};

// ─── Entry Point ───────────────────────────────────────────────────────────
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
