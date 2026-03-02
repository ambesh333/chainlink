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

AVAILABLE BLOCK TYPES:

1. TRIGGER blocks (type: "trigger"):
   - "cron": Scheduled trigger. Data: { schedule: "*/5 * * * *" }

2. DATA blocks (type: "data"):
   - "fetch_stats": Fetch resource stats. Data: { resourceId: "uuid" }

3. CONDITION blocks (type: "condition"):
   - "compare": Compare a metric. Data: { metric: "accessCount"|"currentPrice"|"totalEarnings"|"settledCount", operator: ">"|"<"|">="|"<="|"==", value: number }

4. AI blocks (type: "ai"):
   - "price_analysis": AI price recommendation. Data: {}

5. ACTION blocks (type: "action"):
   - "update_price": Update resource price. Data: { resourceId: "uuid", mode: "ai_recommended"|"fixed"|"percentage", value?: number }
   - "toggle_resource": Enable/disable resource. Data: { resourceId: "uuid", active: boolean }

NODE FORMAT:
{
  "id": "node_1",
  "type": "trigger"|"data"|"condition"|"ai"|"action",
  "position": { "x": number, "y": number },
  "data": {
    "blockType": string (from above),
    "label": string (display name),
    "config": { ... block-specific data }
  }
}

EDGE FORMAT:
{
  "id": "edge_1_2",
  "source": "node_1",
  "target": "node_2",
  "sourceHandle": "default" or "true"|"false" (for condition nodes),
  "label": optional string
}

LAYOUT: Place nodes vertically, 250px apart on Y axis, centered on X=400.
For condition branches: true path goes left (x=200), false path goes right (x=600).

RULES:
- Always start with a trigger node
- Follow with data fetch nodes
- Then conditions or AI analysis
- End with action nodes
- Connect all nodes with edges
- Use the actual resource IDs provided

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

        return {
            nodes: parsed.nodes,
            edges: parsed.edges,
            name: parsed.name || 'AI Generated Workflow',
            description: parsed.description || prompt,
            schedule: parsed.schedule || '*/5 * * * *',
        };
    } catch (error: any) {
        console.error('AI workflow generation failed:', error.message);
        throw new Error(`Workflow generation failed: ${error.message}`);
    }
}
