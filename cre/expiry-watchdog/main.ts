/**
 * CRE Expiry Watchdog Workflow
 *
 * Cron-triggered every 60 seconds. Queries the backend for expired escrows
 * and submits on-chain reports to refund agents (payMerchant = false).
 *
 * Flow:
 * 1. Cron Trigger → every 60s
 * 2. Confidential HTTP → GET /api/cre/expired-escrows
 * 3. For each expired escrow → Report + WriteReport → refund agent
 */

import {
  CronCapability,
  EVMClient,
  ConfidentialHTTPClient,
  handler,
  Runner,
  type Runtime,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, type Hex } from "viem";

// ─── Config ────────────────────────────────────────────────────────────────
type Config = {
  schedule: string;
  escrowContractAddress: string;
  disputeConsumerAddress: string;
  backendUrl: string;
  chainName: string;
  gasLimit: string;
};

// ─── Handler ───────────────────────────────────────────────────────────────
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const config = runtime.config;
  const now = runtime.now();

  runtime.log(`Expiry watchdog triggered at ${now.toISOString()}`);

  // ── 1. Fetch expired escrows from backend ─────────────────────────────
  const confidentialHttp = new ConfidentialHTTPClient();

  const response = confidentialHttp
    .sendRequest(runtime, {
      request: {
        url: `${config.backendUrl}/cre/expired-escrows`,
        method: "GET",
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
        },
      },
    })
    .result();

  let expiredKeys: string[] = [];

  try {
    const bodyStr = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyStr);
    expiredKeys = (result.expired ?? []).map(
      (e: { escrowKey: string }) => e.escrowKey
    );
    runtime.log(`Found ${expiredKeys.length} expired escrow(s)`);
  } catch {
    runtime.log("Failed to parse expired-escrows response");
    return "Error: failed to fetch expired escrows";
  }

  if (expiredKeys.length === 0) {
    runtime.log("No expired escrows found");
    return "No expired escrows";
  }

  // ── 2. Submit reports for each expired escrow ─────────────────────────
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  let processed = 0;

  for (const escrowKey of expiredKeys) {
    runtime.log(`Processing expired escrow: ${escrowKey}`);

    // Encode report: (bytes32 key, bool payMerchant=false) → refund agent
    const reportData = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bool" }],
      [escrowKey as Hex, false]
    );

    runtime.log(
      `Generating signed report → escrowKey=${escrowKey}, payMerchant=false (refund)`
    );

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    runtime.log(`Submitting expiry report to DisputeConsumer...`);

    const writeReportResult = evmClient
      .writeReport(runtime, {
        receiver: config.disputeConsumerAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: config.gasLimit,
        },
      })
      .result();

    const finalTxHash = bytesToHex(
      writeReportResult.txHash || new Uint8Array(32)
    );

    runtime.log(`Expiry refund tx succeeded: ${finalTxHash}`);
    runtime.log(
      `View transaction at https://sepolia.etherscan.io/tx/${finalTxHash}`
    );

    // ── Notify backend so DB is updated to REFUNDED ─────────────────
    try {
      const notifyPayload = JSON.stringify({
        escrowKey,
        txHash: finalTxHash,
      });

      const notifyResponse = confidentialHttp.sendRequest(runtime, {
        request: {
          url: `${config.backendUrl}/cre/expiry-refunded`,
          method: "POST",
          multiHeaders: {
            "Content-Type": { values: ["application/json"] },
          },
          bodyString: notifyPayload,
        },
      }).result();

      const notifyBody = new TextDecoder().decode(notifyResponse.body);
      runtime.log(
        `Backend notified: expiry-refunded status=${notifyResponse.statusCode} body=${notifyBody}`
      );
    } catch {
      runtime.log(`Warning: failed to notify backend for expired ${escrowKey}`);
    }

    processed++;
  }

  const summary = `Expiry watchdog: refunded ${processed}/${expiredKeys.length} expired escrow(s)`;
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
