/**
 * AI Workflow Generation Service
 *
 * Generates workflow definitions (React Flow nodes + edges) from natural language prompts.
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

type AIProvider = 'google' | 'openai' | 'anthropic';

function createModel(provider: AIProvider) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) throw new Error('AI_API_KEY environment variable is required');

    switch (provider) {
        case 'google':
            return new ChatGoogleGenerativeAI({ apiKey, model: 'gemini-2.0-flash', temperature: 0.4 });
        case 'openai':
            return new ChatOpenAI({ apiKey, model: 'gpt-4o-mini', temperature: 0.4 });
        case 'anthropic':
            return new ChatAnthropic({ apiKey, model: 'claude-sonnet-4-20250514', temperature: 0.4 });
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}

interface ResourceInfo {
    id: string;
    title: string;
    price: number;
    type: string;
    isActive: boolean;
}

const SYSTEM_PROMPT = `You are a workflow builder AI for a decentralized data marketplace. You generate workflow definitions as React Flow nodes and edges.

MANDATORY STRUCTURE:
Every workflow MUST have Start as the first node and Stop as the last node.
The standard linear flow is: Start → Cron Schedule → Fetch Stats → [AI/Condition/Action blocks] → Stop

AVAILABLE BLOCK TYPES:

1. FLOW blocks (required):
   - "start": Entry point. type: "trigger", config: {}. ID MUST be "node_start"
   - "stop": Exit point. type: "action", config: {}. ID MUST be "node_stop"

2. TRIGGER blocks (type: "trigger"):
   - "cron": Scheduled trigger. config: { schedule: "*/5 * * * *" }

3. DATA blocks (type: "data"):
   - "fetch_stats": Fetch resource stats. config: { resourceId: "uuid" }

4. CONDITION blocks (type: "condition"):
   - "compare": Compare a metric. config: { metric: "accessCount"|"currentPrice"|"totalEarnings"|"settledCount", operator: ">"|"<"|">="|"<="|"==", value: number }
   Condition nodes have TWO output handles: "true" and "false".

5. AI blocks (type: "ai"):
   - "price_analysis": AI price recommendation. config: {}

6. ACTION blocks (type: "action"):
   - "update_price": Update resource price. config: { mode: "ai_recommended"|"fixed"|"percentage", value?: number }
   - "toggle_resource": Enable/disable resource. config: { active: boolean }
   - "telegram_notify": Send Telegram message. config: { chatId: "string", message: "string with {{currentPrice}}, {{accessCount}}, {{totalEarnings}}, {{settledCount}} template vars", botToken?: "optional" }

NODE ID RULES:
- Start block: "node_start"
- Stop block: "node_stop"
- All other blocks: "node_100", "node_101", "node_102", etc. (sequential)

EDGE FORMAT — every edge MUST have animated and style:
{ "id": "edge_<source>_<target>", "source": "<id>", "target": "<id>", "sourceHandle": "default", "animated": true, "style": { "stroke": "#ffffff20", "strokeWidth": 2 } }
For condition outputs use sourceHandle: "true" or "false".

LAYOUT:
- Start at position {x:400, y:50}
- Each subsequent node 120px below: y=170, 290, 410, 530, 650...
- All nodes centered at x=400 (for linear flows)
- For condition branches: true path x=200, false path x=600
- Stop is always the last node at the bottom

CRITICAL RULES:
- ALWAYS include Start (node_start) as first node and Stop (node_stop) as last node
- ALL edges must connect in a chain — no disconnected nodes
- ALL paths MUST end at the Stop node
- Use actual resource IDs from the provided list (pick the first one if the user doesn't specify)

===== REFERENCE EXAMPLES =====

EXAMPLE 1: "Check if access count > 3, use AI analysis to update price"
This is the STANDARD pattern for AI-powered pricing workflows. Flow:
Start → Cron → Fetch Stats → Price Analysis → Compare → Update Price → Stop

{
  "nodes": [
    {"id":"node_start","type":"trigger","position":{"x":400,"y":50},"data":{"blockType":"start","label":"Start","config":{}}},
    {"id":"node_100","type":"trigger","position":{"x":400,"y":170},"data":{"blockType":"cron","label":"Cron Schedule","config":{"schedule":"*/5 * * * *"}}},
    {"id":"node_101","type":"data","position":{"x":400,"y":290},"data":{"blockType":"fetch_stats","label":"Fetch Stats","config":{"resourceId":"RESOURCE_ID"}}},
    {"id":"node_102","type":"ai","position":{"x":400,"y":410},"data":{"blockType":"price_analysis","label":"Price Analysis","config":{}}},
    {"id":"node_103","type":"condition","position":{"x":400,"y":530},"data":{"blockType":"compare","label":"Compare Metric","config":{"metric":"accessCount","operator":">","value":3}}},
    {"id":"node_104","type":"action","position":{"x":400,"y":650},"data":{"blockType":"update_price","label":"Update Price","config":{"mode":"ai_recommended"}}},
    {"id":"node_stop","type":"action","position":{"x":400,"y":770},"data":{"blockType":"stop","label":"Stop","config":{}}}
  ],
  "edges": [
    {"id":"edge_node_start_node_100","source":"node_start","target":"node_100","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_100_node_101","source":"node_100","target":"node_101","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_101_node_102","source":"node_101","target":"node_102","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_103","source":"node_102","target":"node_103","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_103_node_104","source":"node_103","target":"node_104","sourceHandle":"true","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_104_node_stop","source":"node_104","target":"node_stop","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_103_node_stop","source":"node_103","target":"node_stop","sourceHandle":"false","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}}
  ],
  "name": "AI Dynamic Pricing",
  "description": "Checks access count and uses AI to adjust pricing",
  "schedule": "*/5 * * * *"
}

EXAMPLE 2: "Disable resource when earnings exceed 0.5 ETH"
Start → Cron → Fetch Stats → Compare (totalEarnings > 0.5) → Toggle Resource → Stop

{
  "nodes": [
    {"id":"node_start","type":"trigger","position":{"x":400,"y":50},"data":{"blockType":"start","label":"Start","config":{}}},
    {"id":"node_100","type":"trigger","position":{"x":400,"y":170},"data":{"blockType":"cron","label":"Cron Schedule","config":{"schedule":"*/5 * * * *"}}},
    {"id":"node_101","type":"data","position":{"x":400,"y":290},"data":{"blockType":"fetch_stats","label":"Fetch Stats","config":{"resourceId":"RESOURCE_ID"}}},
    {"id":"node_102","type":"condition","position":{"x":400,"y":410},"data":{"blockType":"compare","label":"Compare Earnings","config":{"metric":"totalEarnings","operator":">","value":0.5}}},
    {"id":"node_103","type":"action","position":{"x":400,"y":530},"data":{"blockType":"toggle_resource","label":"Disable Resource","config":{"active":false}}},
    {"id":"node_stop","type":"action","position":{"x":400,"y":650},"data":{"blockType":"stop","label":"Stop","config":{}}}
  ],
  "edges": [
    {"id":"edge_node_start_node_100","source":"node_start","target":"node_100","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_100_node_101","source":"node_100","target":"node_101","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_101_node_102","source":"node_101","target":"node_102","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_103","source":"node_102","target":"node_103","sourceHandle":"true","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_103_node_stop","source":"node_103","target":"node_stop","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_stop","source":"node_102","target":"node_stop","sourceHandle":"false","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}}
  ],
  "name": "Auto-Disable on Earnings Cap",
  "description": "Disables resource when total earnings exceed 0.5 ETH",
  "schedule": "*/5 * * * *"
}

EXAMPLE 3: "Reduce price by 10% when demand is low (access count < 5)"
Start → Cron → Fetch Stats → Compare (accessCount < 5) → Update Price (percentage, -10) → Stop

{
  "nodes": [
    {"id":"node_start","type":"trigger","position":{"x":400,"y":50},"data":{"blockType":"start","label":"Start","config":{}}},
    {"id":"node_100","type":"trigger","position":{"x":400,"y":170},"data":{"blockType":"cron","label":"Cron Schedule","config":{"schedule":"*/5 * * * *"}}},
    {"id":"node_101","type":"data","position":{"x":400,"y":290},"data":{"blockType":"fetch_stats","label":"Fetch Stats","config":{"resourceId":"RESOURCE_ID"}}},
    {"id":"node_102","type":"condition","position":{"x":400,"y":410},"data":{"blockType":"compare","label":"Low Demand?","config":{"metric":"accessCount","operator":"<","value":5}}},
    {"id":"node_103","type":"action","position":{"x":400,"y":530},"data":{"blockType":"update_price","label":"Discount 10%","config":{"mode":"percentage","value":-10}}},
    {"id":"node_stop","type":"action","position":{"x":400,"y":650},"data":{"blockType":"stop","label":"Stop","config":{}}}
  ],
  "edges": [
    {"id":"edge_node_start_node_100","source":"node_start","target":"node_100","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_100_node_101","source":"node_100","target":"node_101","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_101_node_102","source":"node_101","target":"node_102","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_103","source":"node_102","target":"node_103","sourceHandle":"true","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_103_node_stop","source":"node_103","target":"node_stop","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_stop","source":"node_102","target":"node_stop","sourceHandle":"false","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}}
  ],
  "name": "Discount on Low Demand",
  "description": "Reduces price by 10% when access count is below 5",
  "schedule": "*/5 * * * *"
}

EXAMPLE 4: "Pause resource when settled count is less than 2"
Start → Cron → Fetch Stats → Compare (settledCount < 2) → Toggle Resource (false) → Stop

{
  "nodes": [
    {"id":"node_start","type":"trigger","position":{"x":400,"y":50},"data":{"blockType":"start","label":"Start","config":{}}},
    {"id":"node_100","type":"trigger","position":{"x":400,"y":170},"data":{"blockType":"cron","label":"Cron Schedule","config":{"schedule":"*/5 * * * *"}}},
    {"id":"node_101","type":"data","position":{"x":400,"y":290},"data":{"blockType":"fetch_stats","label":"Fetch Stats","config":{"resourceId":"RESOURCE_ID"}}},
    {"id":"node_102","type":"condition","position":{"x":400,"y":410},"data":{"blockType":"compare","label":"Low Settlements?","config":{"metric":"settledCount","operator":"<","value":2}}},
    {"id":"node_103","type":"action","position":{"x":400,"y":530},"data":{"blockType":"toggle_resource","label":"Pause Resource","config":{"active":false}}},
    {"id":"node_stop","type":"action","position":{"x":400,"y":650},"data":{"blockType":"stop","label":"Stop","config":{}}}
  ],
  "edges": [
    {"id":"edge_node_start_node_100","source":"node_start","target":"node_100","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_100_node_101","source":"node_100","target":"node_101","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_101_node_102","source":"node_101","target":"node_102","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_103","source":"node_102","target":"node_103","sourceHandle":"true","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_103_node_stop","source":"node_103","target":"node_stop","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}},
    {"id":"edge_node_102_node_stop","source":"node_102","target":"node_stop","sourceHandle":"false","animated":true,"style":{"stroke":"#ffffff20","strokeWidth":2}}
  ],
  "name": "Settlement Monitor",
  "description": "Pauses resource when settled transaction count is below 2",
  "schedule": "*/5 * * * *"
}

===== END EXAMPLES =====

For any request involving AI price analysis or AI-powered pricing, ALWAYS use the EXAMPLE 1 pattern:
Start → Cron → Fetch Stats → Price Analysis → Compare → Update Price (mode: ai_recommended) → Stop

For requests involving low demand or discount pricing, use the EXAMPLE 3 pattern.
For requests involving settlement monitoring or pausing resources, use the EXAMPLE 4 pattern.
For requests mentioning Telegram or notifications, add a telegram_notify action block with config: { chatId: "USER_CHAT_ID", message: "template with {{variables}}" }.

Replace RESOURCE_ID with the actual resource ID from the provided list.

Respond ONLY with a JSON object: { "nodes": [...], "edges": [...], "name": "workflow name", "description": "brief description", "schedule": "cron expression" }`;

export async function generateWorkflowFromPrompt(
    prompt: string,
    resources: ResourceInfo[]
): Promise<{
    nodes: any[];
    edges: any[];
    name: string;
    description: string;
    schedule: string;
}> {
    const provider = (process.env.AI_PROVIDER || 'google') as AIProvider;
    const model = createModel(provider);

    const resourceList = resources.map(r =>
        `- ID: ${r.id}, Title: "${r.title}", Price: ${r.price} ETH, Type: ${r.type}, Active: ${r.isActive}`
    ).join('\n');

    const userPrompt = `Generate a workflow for the following request:

"${prompt}"

AVAILABLE RESOURCES:
${resourceList || '(No resources yet — use placeholder IDs)'}

Respond ONLY with the JSON object.`;

    const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
    ];

    try {
        const response = await model.invoke(messages);
        const content = response.content as string;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const parsed = JSON.parse(jsonMatch[0]);

        if (!parsed.nodes || !parsed.edges) {
            throw new Error('Generated workflow missing nodes or edges');
        }

        const { nodes, edges } = normalizeWorkflow(parsed.nodes, parsed.edges);

        return {
            nodes,
            edges,
            name: parsed.name || 'AI Generated Workflow',
            description: parsed.description || prompt,
            schedule: parsed.schedule || '*/5 * * * *',
        };
    } catch (error: any) {
        console.error('AI workflow generation failed:', error.message);
        throw new Error(`Workflow generation failed: ${error.message}`);
    }
}

/**
 * Post-processes AI output to ensure Start/Stop blocks exist,
 * IDs follow convention, and edges have proper styles.
 */
function normalizeWorkflow(rawNodes: any[], rawEdges: any[]): { nodes: any[]; edges: any[] } {
    const edgeStyle = { stroke: '#ffffff20', strokeWidth: 2 };
    let nodes = [...rawNodes];
    let edges = [...rawEdges];

    // Remap old IDs → new IDs
    const idMap: Record<string, string> = {};
    let counter = 100;

    // Check if Start exists
    const hasStart = nodes.some(n => n.data?.blockType === 'start');
    // Check if Stop exists
    const hasStop = nodes.some(n => n.data?.blockType === 'stop');

    // Assign proper IDs
    for (const node of nodes) {
        const oldId = node.id;
        if (node.data?.blockType === 'start') {
            idMap[oldId] = 'node_start';
            node.id = 'node_start';
        } else if (node.data?.blockType === 'stop') {
            idMap[oldId] = 'node_stop';
            node.id = 'node_stop';
        } else {
            const newId = `node_${counter++}`;
            idMap[oldId] = newId;
            node.id = newId;
        }
    }

    // Remap edge source/target IDs
    for (const edge of edges) {
        edge.source = idMap[edge.source] || edge.source;
        edge.target = idMap[edge.target] || edge.target;
        edge.id = `edge_${edge.source}_${edge.target}`;
        edge.animated = true;
        edge.style = edgeStyle;
        if (!edge.sourceHandle) edge.sourceHandle = 'default';
    }

    // Find y-bounds for positioning Start/Stop
    const yPositions = nodes.map(n => n.position?.y ?? 0);
    const minY = Math.min(...yPositions);
    const maxY = Math.max(...yPositions);

    // Add Start if missing
    if (!hasStart) {
        const startNode = {
            id: 'node_start',
            type: 'trigger',
            position: { x: 400, y: minY - 120 },
            data: { blockType: 'start', label: 'Start', config: {} },
        };
        nodes.unshift(startNode);

        // Connect Start to the first non-start node
        const firstNode = nodes.find(n => n.id !== 'node_start' && n.id !== 'node_stop');
        if (firstNode) {
            edges.unshift({
                id: `edge_node_start_${firstNode.id}`,
                source: 'node_start',
                target: firstNode.id,
                sourceHandle: 'default',
                animated: true,
                style: edgeStyle,
            });
        }
    }

    // Add Stop if missing
    if (!hasStop) {
        const stopNode = {
            id: 'node_stop',
            type: 'action',
            position: { x: 400, y: maxY + 120 },
            data: { blockType: 'stop', label: 'Stop', config: {} },
        };
        nodes.push(stopNode);

        // Find nodes with no outgoing edges (leaf nodes) and connect them to Stop
        const sourcesSet = new Set(edges.map(e => e.source));
        const leafNodes = nodes.filter(n => n.id !== 'node_stop' && !sourcesSet.has(n.id));
        for (const leaf of leafNodes) {
            edges.push({
                id: `edge_${leaf.id}_node_stop`,
                source: leaf.id,
                target: 'node_stop',
                sourceHandle: 'default',
                animated: true,
                style: edgeStyle,
            });
        }
    }

    // Recalculate Y positions to ensure proper spacing
    // Sort nodes by current Y, then space them evenly
    const startNode = nodes.find(n => n.id === 'node_start');
    const stopNode = nodes.find(n => n.id === 'node_stop');
    const middleNodes = nodes.filter(n => n.id !== 'node_start' && n.id !== 'node_stop');

    // Sort middle nodes by their Y position to preserve intended order
    middleNodes.sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));

    if (startNode) startNode.position = { x: 400, y: 50 };

    let currentY = 170;
    for (const node of middleNodes) {
        // Keep x position for branched nodes, default to 400
        const x = node.position?.x ?? 400;
        node.position = { x, y: currentY };
        currentY += 120;
    }

    if (stopNode) stopNode.position = { x: 400, y: currentY };

    return { nodes, edges };
}
