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
  type Runtime,
  type EVMLog,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, type Hex } from "viem";

// ─── Config ────────────────────────────────────────────────────────────────
type Config = {
  escrowContractAddress: string;
  disputeConsumerAddress: string;
  backendUrl: string;
  chainName: string;
  gasLimit: string;
};

// SettlementRequested(bytes32 indexed key, address indexed agent)
const SETTLEMENT_REQUESTED_EVENT_SIG =
  "0x96186b8375a7f1e5d882fb44d498e7e41e518e3ae009fd917965bffc28b3b65e";

function decodeTopic(topic: unknown): Hex {
  if (!topic) return "0x";
  if (typeof topic === "string") return topic as Hex;
  if (topic instanceof Uint8Array) {
    return ("0x" + Buffer.from(topic).toString("hex")) as Hex;
  }
  throw new Error("Invalid topic format");
}

// ─── Handler ───────────────────────────────────────────────────────────────
const onSettlementRequested = (
  runtime: Runtime<Config>,
  triggerOutput: EVMLog
): string => {
  const config = runtime.config;

  const escrowKey = decodeTopic(triggerOutput.topics?.[1]);
  const txHash = decodeTopic(triggerOutput.txHash);

  runtime.log(`SettlementRequested detected`);
  runtime.log(`Escrow Key: ${escrowKey}`);
  runtime.log(`Original TX: ${txHash}`);

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
  const reportData = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bool" }],
    [escrowKey, true] // payMerchant = true
  );

  runtime.log(
    `Generating signed report → escrowKey=${escrowKey}, payMerchant=true`
  );

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // ── 3. Write report to DisputeConsumer ───────────────────────────────
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  runtime.log(`Submitting report to DisputeConsumer...`);

  const writeReportResult = evmClient
    .writeReport(runtime, {
      receiver: config.disputeConsumerAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: config.gasLimit,
      },
    })
    .result();

  runtime.log("Waiting for write report response...");

  const finalTxHash = bytesToHex(
    writeReportResult.txHash || new Uint8Array(32)
  );

  runtime.log(`Write report transaction succeeded: ${finalTxHash}`);
  runtime.log(
    `View transaction at https://sepolia.etherscan.io/tx/${finalTxHash}`
  );

  // ── 4. Notify backend so DB is updated immediately ────────────────
  try {
    const notifyPayload = JSON.stringify({
      escrowKey,
      txHash: finalTxHash,
    });

    confidentialHttp.sendRequest(runtime, {
      request: {
        url: `${config.backendUrl}/cre/settlement-complete`,
        method: "POST",
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
        },
        body: { value: notifyPayload, case: "bodyString" as const },
      },
    }).result();

    runtime.log(`Backend notified: settlement-complete for ${escrowKey}`);
  } catch {
    runtime.log(`Warning: failed to notify backend for ${escrowKey}`);
  }

  return `Settled: ${escrowKey} → payMerchant=true | txHash=${finalTxHash}`;
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
