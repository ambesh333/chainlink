/**
 * CRE Workflow Engine — Meta-Workflow
 *
 * A cron-triggered CRE workflow that interprets dynamic JSON workflow definitions
 * fetched from the backend. Users can create unlimited workflows without deploying
 * new CRE code.
 *
 * Flow:
 * 1. Cron fires → fetch active workflows from backend
 * 2. For each workflow: traverse nodes (trigger → data → condition → AI → action)
 * 3. Each step uses ConfidentialHTTPClient to call backend APIs
 * 4. Log execution results back to backend
 * 5. Write batch audit report on-chain
 *
 * CRE Features Used:
 * - CronCapability: Triggers engine every 5 min
 * - ConfidentialHTTPClient: All backend API calls (5+ per run)
 * - runtime.report(): Signed audit report per execution batch
 * - evmClient.writeReport(): On-chain audit trail on Sepolia
 * - runtime.log(): Step-by-step execution logging
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
import { encodeAbiParameters, keccak256, toHex, type Hex } from "viem";

// ─── Config ────────────────────────────────────────────────────────────────
type Config = {
  schedule: string;
  escrowContractAddress: string;
  disputeConsumerAddress: string;
  backendUrl: string;
  chainName: string;
  gasLimit: string;
};

// ─── Types ─────────────────────────────────────────────────────────────────
interface WorkflowNode {
  id: string;
  type: "trigger" | "data" | "condition" | "ai" | "action";
  data: {
    blockType: string;
    label: string;
    config: Record<string, any>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface ActiveWorkflow {
  id: string;
  name: string;
  definition: WorkflowDefinition;
  schedule: string | null;
  userId: string;
}

// ─── HTTP Helper ───────────────────────────────────────────────────────────
function httpGet(
  runtime: Runtime<Config>,
  http: ConfidentialHTTPClient,
  url: string
): any {
  const response = http
    .sendRequest(runtime, {
      request: {
        url,
        method: "GET",
        multiHeaders: { "Content-Type": { values: ["application/json"] } },
      },
    })
    .result();

  const bodyStr = new TextDecoder().decode(response.body);
  return JSON.parse(bodyStr);
}

function httpPost(
  runtime: Runtime<Config>,
  http: ConfidentialHTTPClient,
  url: string,
  body: any
): any {
  const response = http
    .sendRequest(runtime, {
      request: {
        url,
        method: "POST",
        multiHeaders: { "Content-Type": { values: ["application/json"] } },
        bodyString: JSON.stringify(body),
      },
    })
    .result();

  const bodyStr = new TextDecoder().decode(response.body);
  return JSON.parse(bodyStr);
}

// ─── Node Executor ─────────────────────────────────────────────────────────
function executeNode(
  runtime: Runtime<Config>,
  http: ConfidentialHTTPClient,
  node: WorkflowNode,
  context: Record<string, any>
): { success: boolean; output: any; conditionResult?: boolean } {
  const config = runtime.config;
  const { blockType, config: nodeConfig } = node.data;

  runtime.log(`  Executing node: ${node.data.label} (${blockType})`);

  switch (node.type) {
    case "trigger": {
      // Trigger nodes just pass through — cron already triggered
      return { success: true, output: { triggered: true } };
    }

    case "data": {
      if (blockType === "fetch_stats") {
        const resourceId = nodeConfig.resourceId;
        if (!resourceId) {
          return { success: false, output: { error: "No resourceId configured" } };
        }

        const stats = httpGet(
          runtime,
          http,
          `${config.backendUrl}/cre/resource-stats/${resourceId}`
        );

        runtime.log(`  Stats: price=${stats.currentPrice}, access=${stats.accessCount}, earned=${stats.totalEarnings}`);

        // Store stats in context for downstream nodes
        context.resourceStats = stats;
        context.currentPrice = stats.currentPrice;
        context.accessCount = stats.accessCount;
        context.totalEarnings = stats.totalEarnings;
        context.settledCount = stats.settledCount;
        context.resourceId = resourceId;

        return { success: true, output: stats };
      }
      return { success: false, output: { error: `Unknown data block: ${blockType}` } };
    }

    case "condition": {
      if (blockType === "compare") {
        const { metric, operator, value } = nodeConfig;
        const metricValue = context[metric];

        if (metricValue === undefined) {
          runtime.log(`  Condition: metric "${metric}" not found in context`);
          return { success: true, output: { result: false }, conditionResult: false };
        }

        let result = false;
        switch (operator) {
          case ">":  result = metricValue > value; break;
          case "<":  result = metricValue < value; break;
          case ">=": result = metricValue >= value; break;
          case "<=": result = metricValue <= value; break;
          case "==": result = metricValue == value; break;
        }

        runtime.log(`  Condition: ${metric}(${metricValue}) ${operator} ${value} → ${result}`);
        return { success: true, output: { metric, metricValue, operator, value, result }, conditionResult: result };
      }
      return { success: false, output: { error: `Unknown condition block: ${blockType}` } };
    }

    case "ai": {
      if (blockType === "price_analysis") {
        const analysisInput = {
          resourceId: context.resourceId || "",
          currentPrice: context.currentPrice || 0,
          accessCount: context.accessCount || 0,
          totalEarnings: context.totalEarnings || 0,
          settledCount: context.settledCount || 0,
        };

        try {
          const analysis = httpPost(
            runtime,
            http,
            `${config.backendUrl}/cre/ai-price-analysis`,
            analysisInput
          );

          if (analysis.error) {
            runtime.log(`  AI Analysis failed: ${analysis.error}. Using fallback.`);
            // Fallback: hold current price
            const fallback = {
              recommendedPrice: context.currentPrice || 0,
              changePercent: 0,
              reasoning: "AI analysis unavailable — holding current price",
              confidence: 50,
              action: "hold",
            };
            context.aiAnalysis = fallback;
            context.recommendedPrice = fallback.recommendedPrice;
            return { success: true, output: fallback };
          }

          runtime.log(`  AI Analysis: action=${analysis.action}, recommended=${analysis.recommendedPrice}, confidence=${analysis.confidence}`);

          context.aiAnalysis = analysis;
          context.recommendedPrice = analysis.recommendedPrice;

          return { success: true, output: analysis };
        } catch (e: any) {
          runtime.log(`  AI Analysis exception: ${e.message || "unknown"}. Using fallback.`);
          const fallback = {
            recommendedPrice: context.currentPrice || 0,
            changePercent: 0,
            reasoning: "AI analysis unavailable — holding current price",
            confidence: 50,
            action: "hold",
          };
          context.aiAnalysis = fallback;
          context.recommendedPrice = fallback.recommendedPrice;
          return { success: true, output: fallback };
        }
      }
      return { success: false, output: { error: `Unknown AI block: ${blockType}` } };
    }

    case "action": {
      if (blockType === "stop") {
        runtime.log(`  Workflow completed`);
        return { success: true, output: { stopped: true } };
      }

      if (blockType === "update_price") {
        const resourceId = nodeConfig.resourceId || context.resourceId;
        let newPrice: number;

        switch (nodeConfig.mode) {
          case "ai_recommended":
            newPrice = context.recommendedPrice || context.currentPrice || 0;
            break;
          case "fixed":
            newPrice = nodeConfig.value || 0;
            break;
          case "percentage": {
            const pct = nodeConfig.value || 0;
            newPrice = (context.currentPrice || 0) * (1 + pct / 100);
            break;
          }
          default:
            newPrice = context.recommendedPrice || context.currentPrice || 0;
        }

        // Round to 6 decimal places
        newPrice = Math.round(newPrice * 1000000) / 1000000;

        try {
          const result = httpPost(runtime, http, `${config.backendUrl}/cre/workflow-action`, {
            action: "update_price",
            resourceId,
            value: newPrice,
          });

          runtime.log(`  Action: Updated price → ${newPrice} ETH`);
          return { success: true, output: result };
        } catch (e: any) {
          runtime.log(`  Action failed: ${e.message || "unknown"}`);
          return { success: false, output: { error: e.message || "update_price failed" } };
        }
      }

      if (blockType === "toggle_resource") {
        const resourceId = nodeConfig.resourceId || context.resourceId;
        try {
          const result = httpPost(runtime, http, `${config.backendUrl}/cre/workflow-action`, {
            action: "toggle_resource",
            resourceId,
            value: nodeConfig.active,
          });

          runtime.log(`  Action: Toggled resource → ${nodeConfig.active ? "active" : "inactive"}`);
          return { success: true, output: result };
        } catch (e: any) {
          runtime.log(`  Action failed: ${e.message || "unknown"}`);
          return { success: false, output: { error: e.message || "toggle_resource failed" } };
        }
      }

      return { success: false, output: { error: `Unknown action block: ${blockType}` } };
    }

    default:
      return { success: false, output: { error: `Unknown node type: ${node.type}` } };
  }
}

// ─── Workflow Interpreter ──────────────────────────────────────────────────
function executeWorkflow(
  runtime: Runtime<Config>,
  http: ConfidentialHTTPClient,
  workflow: ActiveWorkflow
): { status: string; log: string; steps: number } {
  const definition = workflow.definition;
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];

  runtime.log(`\n=== Executing workflow: ${workflow.name} (${workflow.id}) ===`);

  if (nodes.length === 0) {
    return { status: "failed", log: "No nodes in workflow", steps: 0 };
  }

  // Build adjacency map: nodeId → [{ targetId, handle }]
  const adjacency: Record<string, { target: string; handle: string }[]> = {};
  for (const edge of edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push({
      target: edge.target,
      handle: edge.sourceHandle || "default",
    });
  }

  // Find start node (trigger node, or first node with no incoming edges)
  const targetIds = new Set(edges.map((e) => e.target));
  let startNode = nodes.find((n) => n.type === "trigger");
  if (!startNode) {
    startNode = nodes.find((n) => !targetIds.has(n.id));
  }
  if (!startNode) {
    startNode = nodes[0];
  }

  // BFS execution
  const context: Record<string, any> = {};
  const logLines: string[] = [];
  let stepsExecuted = 0;
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    stepsExecuted++;
    const result = executeNode(runtime, http, node, context);

    logLines.push(
      `[${node.data.label}] ${result.success ? "OK" : "FAIL"}: ${JSON.stringify(result.output).substring(0, 200)}`
    );

    if (!result.success) {
      return {
        status: "failed",
        log: logLines.join("\n"),
        steps: stepsExecuted,
      };
    }

    // Find next nodes based on edges
    const outgoing = adjacency[nodeId] || [];
    for (const edge of outgoing) {
      // For condition nodes, follow the appropriate branch
      if (node.type === "condition" && result.conditionResult !== undefined) {
        const expectedHandle = result.conditionResult ? "true" : "false";
        if (edge.handle === expectedHandle || edge.handle === "default") {
          queue.push(edge.target);
        }
      } else {
        queue.push(edge.target);
      }
    }
  }

  return {
    status: "completed",
    log: logLines.join("\n"),
    steps: stepsExecuted,
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const config = runtime.config;
  const now = runtime.now();

  runtime.log(`Workflow engine triggered at ${now.toISOString()}`);

  const http = new ConfidentialHTTPClient();

  // ── 1. Fetch active workflows ────────────────────────────────────────
  let workflows: ActiveWorkflow[] = [];

  try {
    const response = httpGet(runtime, http, `${config.backendUrl}/cre/active-workflows`);
    workflows = response.workflows || [];
    runtime.log(`Found ${workflows.length} active workflow(s)`);
  } catch {
    runtime.log("Failed to fetch active workflows");
    return "Error: failed to fetch active workflows";
  }

  if (workflows.length === 0) {
    runtime.log("No active workflows to execute");
    return "No active workflows";
  }

  // ── 2. Execute each workflow ─────────────────────────────────────────
  const evmClient = new EVMClient(
    EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia"]
  );

  let totalExecuted = 0;
  let totalSucceeded = 0;
  const executionSummaries: string[] = [];

  for (const workflow of workflows) {
    try {
      const result = executeWorkflow(runtime, http, workflow);

      // Log execution to backend
      httpPost(runtime, http, `${config.backendUrl}/cre/workflow-execution`, {
        workflowId: workflow.id,
        status: result.status,
        log: result.log,
        result: { steps: result.steps, timestamp: now.toISOString() },
      });

      totalExecuted++;
      if (result.status === "completed") totalSucceeded++;

      executionSummaries.push(
        `${workflow.name}: ${result.status} (${result.steps} steps)`
      );

      runtime.log(`Workflow ${workflow.name}: ${result.status}`);
    } catch (err) {
      runtime.log(`Workflow ${workflow.name} failed with error`);
      executionSummaries.push(`${workflow.name}: error`);
      totalExecuted++;

      // Still log the failed execution
      try {
        httpPost(runtime, http, `${config.backendUrl}/cre/workflow-execution`, {
          workflowId: workflow.id,
          status: "failed",
          log: "Workflow execution threw an exception",
        });
      } catch {
        // Best effort logging
      }
    }
  }

  // ── 3. Write batch audit report on-chain ─────────────────────────────
  const auditData = encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    [
      BigInt(totalExecuted),
      BigInt(totalSucceeded),
      BigInt(Math.floor(now.getTime() / 1000)),
    ]
  );

  runtime.log(
    `Generating audit report: ${totalSucceeded}/${totalExecuted} workflows succeeded`
  );

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(auditData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log("Submitting audit report on-chain...");

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: config.disputeConsumerAddress,
      report: reportResponse,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result();

  const auditTxHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
  runtime.log(`Audit report tx: ${auditTxHash}`);
  runtime.log(
    `View: https://sepolia.etherscan.io/tx/${auditTxHash}`
  );

  const summary = `Workflow engine: ${totalSucceeded}/${totalExecuted} succeeded. ${executionSummaries.join("; ")}`;
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
