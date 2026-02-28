import {
  EVMClient,
  ConfidentialHTTPClient,
  handler,
  Runner,
  prepareReportRequest,
  encodeCallMsg,
  type Runtime,
  type EVMLog,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk";

import {
  encodeFunctionData,
  encodeAbiParameters,
  type Hex,
  type Address,
} from "viem";

type Config = {
  escrowContractAddress: string;
  disputeConsumerAddress: string;
  backendUrl: string;
  chainName: string;
  gasLimit: string;
};

const DISPUTE_RAISED_EVENT_SIG =
  "0x255562e4a5019b56d8cea1a092a988f24c5482ce33b57586784208be247693c1";

function decodeTopic(topic: unknown): Hex {
  if (!topic) return "0x";
  if (typeof topic === "string") return topic as Hex;
  if (topic instanceof Uint8Array) {
    return ("0x" + Buffer.from(topic).toString("hex")) as Hex;
  }
  throw new Error("Invalid topic format");
}

const onDisputeRaised = (
  runtime: Runtime<Config>,
  triggerOutput: EVMLog
): string => {
  const config = runtime.config;

  const escrowKey = decodeTopic(triggerOutput.topics?.[1]);
  const txHash = decodeTopic(triggerOutput.txHash);

  runtime.log(`DisputeRaised detected`);
  runtime.log(`Escrow Key: ${escrowKey}`);
  runtime.log(`Original TX: ${txHash}`);

  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  // ─────────────────────────────────────
  // 1️⃣ Fetch backend dispute context
  // ─────────────────────────────────────
  const confidentialHttp = new ConfidentialHTTPClient();

  let payMerchant = false;
  let aiReasoning = "Defaulted to refund";
  let aiConfidence = 0;

  try {
    const response = confidentialHttp
      .sendRequest(runtime, {
        request: {
          url: `${config.backendUrl}/cre/analyze-dispute/${escrowKey}`,
          method: "GET",
          multiHeaders: {
            "Content-Type": { values: ["application/json"] },
          },
        },
      })
      .result();

    const bodyStr = new TextDecoder().decode(response.body);
    const aiResult = JSON.parse(bodyStr);

    payMerchant = aiResult.payMerchant ?? false;
    aiReasoning = aiResult.reasoning ?? "No reasoning provided";
    aiConfidence = aiResult.confidence ?? 50;

    runtime.log(`AI Verdict: payMerchant=${payMerchant}`);
    runtime.log(`AI Confidence: ${aiConfidence}`);
    runtime.log(`AI Reasoning: ${aiReasoning}`);
  } catch (err) {
    runtime.log("AI backend call failed — defaulting to refund agent");
  }

  // ─────────────────────────────────────
  // 2️⃣ Encode report payload
  // ─────────────────────────────────────
  const reportData = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bool" }],
    [escrowKey, payMerchant]
  );

  runtime.log(
    `Generating signed report → escrowKey=${escrowKey}, payMerchant=${payMerchant}`
  );

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  // ─────────────────────────────────────
  // 3️⃣ Submit report onchain
  // ─────────────────────────────────────
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

  return `Resolved ${escrowKey} → payMerchant=${payMerchant} | txHash=${finalTxHash}`;
};

// ─────────────────────────────────────
// Workflow Init
// ─────────────────────────────────────
const initWorkflow = (config: Config) => {
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  const trigger = evmClient.logTrigger({
    addresses: [config.escrowContractAddress],
    topics: [{ values: [DISPUTE_RAISED_EVENT_SIG] }],
  });

  return [handler(trigger, onDisputeRaised)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}