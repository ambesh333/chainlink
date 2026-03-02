import { Request, Response } from 'express';
import { prisma } from '../context';
import { generateWorkflowFromPrompt } from '../services/aiWorkflowService';

/**
 * GET /api/workflows
 * List all workflows for the authenticated user
 */
export const listWorkflows = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const workflows = await prisma.workflow.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                schedule: true,
                lastRunAt: true,
                runCount: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.json({ workflows });
    } catch (error) {
        console.error('List workflows error:', error);
        return res.status(500).json({ error: 'Failed to fetch workflows' });
    }
};

/**
 * GET /api/workflows/:id
 * Get a single workflow with recent executions
 */
export const getWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const workflow = await prisma.workflow.findFirst({
            where: { id, userId },
            include: {
                executions: {
                    orderBy: { startedAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

        return res.json({ workflow });
    } catch (error) {
        console.error('Get workflow error:', error);
        return res.status(500).json({ error: 'Failed to fetch workflow' });
    }
};

/**
 * POST /api/workflows
 * Create a new workflow
 */
export const createWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, description, definition, schedule } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Workflow name is required' });
        }

        const workflow = await prisma.workflow.create({
            data: {
                userId,
                name,
                description: description || null,
                definition: definition || { nodes: [], edges: [] },
                schedule: schedule || null,
            },
        });

        return res.status(201).json({ workflow });
    } catch (error) {
        console.error('Create workflow error:', error);
        return res.status(500).json({ error: 'Failed to create workflow' });
    }
};

/**
 * PATCH /api/workflows/:id
 * Update a workflow's definition, name, description, or schedule
 */
export const updateWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.workflow.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Workflow not found' });

        const { name, description, definition, schedule, status } = req.body;

        const workflow = await prisma.workflow.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(definition !== undefined && { definition }),
                ...(schedule !== undefined && { schedule }),
                ...(status !== undefined && { status }),
            },
        });

        return res.json({ workflow });
    } catch (error) {
        console.error('Update workflow error:', error);
        return res.status(500).json({ error: 'Failed to update workflow' });
    }
};

/**
 * DELETE /api/workflows/:id
 */
export const deleteWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.workflow.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Workflow not found' });

        // Delete executions first, then workflow
        await prisma.workflowExecution.deleteMany({ where: { workflowId: id } });
        await prisma.workflow.delete({ where: { id } });

        return res.json({ success: true });
    } catch (error) {
        console.error('Delete workflow error:', error);
        return res.status(500).json({ error: 'Failed to delete workflow' });
    }
};

/**
 * POST /api/workflows/:id/activate
 * Set workflow status to ACTIVE
 */
export const activateWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.workflow.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Workflow not found' });

        const workflow = await prisma.workflow.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        return res.json({ workflow });
    } catch (error) {
        console.error('Activate workflow error:', error);
        return res.status(500).json({ error: 'Failed to activate workflow' });
    }
};

/**
 * POST /api/workflows/:id/pause
 * Set workflow status to PAUSED
 */
export const pauseWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await prisma.workflow.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Workflow not found' });

        const workflow = await prisma.workflow.update({
            where: { id },
            data: { status: 'PAUSED' },
        });

        return res.json({ workflow });
    } catch (error) {
        console.error('Pause workflow error:', error);
        return res.status(500).json({ error: 'Failed to pause workflow' });
    }
};

/**
 * POST /api/workflows/:id/test
 * Test-run a workflow server-side by interpreting its definition step-by-step
 */
export const testWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const id = req.params.id as string;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
        if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

        const definition = workflow.definition as any;
        const nodes: any[] = definition?.nodes || [];
        const edges: any[] = definition?.edges || [];

        // Validate start/stop
        const hasStart = nodes.some((n: any) => n.data?.blockType === 'start');
        const hasStop = nodes.some((n: any) => n.data?.blockType === 'stop');
        if (!hasStart || !hasStop) {
            return res.status(400).json({ error: 'Workflow must have both Start and Stop blocks' });
        }

        // Build adjacency
        const adjacency: Record<string, { target: string; handle: string }[]> = {};
        for (const edge of edges) {
            if (!adjacency[edge.source]) adjacency[edge.source] = [];
            adjacency[edge.source].push({ target: edge.target, handle: edge.sourceHandle || 'default' });
        }

        // Find start node
        const startNode = nodes.find((n: any) => n.data?.blockType === 'start');
        if (!startNode) return res.status(400).json({ error: 'No start block found' });

        // BFS execution (dry-run — only fetch_stats and conditions are actually evaluated)
        const context: Record<string, any> = {};
        const logLines: string[] = [];
        const visited = new Set<string>();
        const queue = [startNode.id];
        let stepsExecuted = 0;

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = nodes.find((n: any) => n.id === nodeId);
            if (!node) continue;

            stepsExecuted++;
            const blockType = node.data?.blockType;
            const label = node.data?.label || blockType;
            const config = node.data?.config || {};

            logLines.push(`[Step ${stepsExecuted}] ${label} (${blockType})`);

            if (blockType === 'start') {
                logLines.push(`  -> Workflow started`);
            } else if (blockType === 'stop') {
                logLines.push(`  -> Workflow completed`);
            } else if (blockType === 'cron') {
                logLines.push(`  -> Schedule: ${config.schedule || 'not set'}`);
            } else if (blockType === 'fetch_stats') {
                if (!config.resourceId) {
                    logLines.push(`  -> WARNING: No resource selected`);
                } else {
                    const resource = await prisma.resource.findUnique({
                        where: { id: config.resourceId },
                        select: { id: true, title: true, price: true },
                    });
                    if (!resource) {
                        logLines.push(`  -> ERROR: Resource not found (${config.resourceId})`);
                    } else {
                        const txns = await prisma.transaction.findMany({
                            where: { resourceId: config.resourceId },
                            select: { status: true, amount: true },
                        });
                        context.currentPrice = resource.price;
                        context.accessCount = txns.length;
                        context.settledCount = txns.filter(t => t.status === 'SETTLED').length;
                        context.totalEarnings = txns.filter(t => t.status === 'SETTLED').reduce((s, t) => s + t.amount, 0);
                        context.resourceId = resource.id;
                        logLines.push(`  -> ${resource.title}: price=${resource.price} ETH, access=${context.accessCount}, settled=${context.settledCount}, earnings=${context.totalEarnings}`);
                    }
                }
            } else if (blockType === 'compare') {
                const metricVal = context[config.metric];
                let result = false;
                if (metricVal !== undefined) {
                    switch (config.operator) {
                        case '>': result = metricVal > config.value; break;
                        case '<': result = metricVal < config.value; break;
                        case '>=': result = metricVal >= config.value; break;
                        case '<=': result = metricVal <= config.value; break;
                        case '==': result = metricVal == config.value; break;
                    }
                }
                logLines.push(`  -> ${config.metric}(${metricVal ?? 'undefined'}) ${config.operator} ${config.value} = ${result}`);
                // Follow only the matching branch
                const outgoing = adjacency[nodeId] || [];
                for (const edge of outgoing) {
                    const expected = result ? 'true' : 'false';
                    if (edge.handle === expected || edge.handle === 'default') {
                        queue.push(edge.target);
                    }
                }
                continue; // Skip default edge following below
            } else if (blockType === 'price_analysis') {
                logLines.push(`  -> AI analysis would run here (skipped in test mode)`);
                context.recommendedPrice = context.currentPrice || 0;
            } else if (blockType === 'update_price') {
                let price = 0;
                if (config.mode === 'ai_recommended') price = context.recommendedPrice || context.currentPrice || 0;
                else if (config.mode === 'fixed') price = config.value || 0;
                else if (config.mode === 'percentage') price = (context.currentPrice || 0) * (1 + (config.value || 0) / 100);
                logLines.push(`  -> Would update price to ${Math.round(price * 1000000) / 1000000} ETH (mode: ${config.mode || 'ai_recommended'})`);
            } else if (blockType === 'toggle_resource') {
                logLines.push(`  -> Would set resource ${config.active !== false ? 'active' : 'inactive'}`);
            } else if (blockType === 'telegram_notify') {
                const chatId = config.chatId || '(not set)';
                const msg = config.message || '(no message)';
                logLines.push(`  -> Would send Telegram message to ${chatId}: ${msg}`);
            }

            // Follow edges (for non-condition nodes)
            const outgoing = adjacency[nodeId] || [];
            for (const edge of outgoing) {
                queue.push(edge.target);
            }
        }

        const log = logLines.join('\n');

        // Save as test execution
        await prisma.workflowExecution.create({
            data: {
                workflowId: id,
                status: 'completed',
                log,
                result: { steps: stepsExecuted, test: true, timestamp: new Date().toISOString() },
                completedAt: new Date(),
            },
        });

        return res.json({
            success: true,
            steps: stepsExecuted,
            log,
        });
    } catch (error: any) {
        console.error('Test workflow error:', error);
        return res.status(500).json({ error: 'Test failed', message: error.message });
    }
};

/**
 * POST /api/workflows/generate
 * AI-generate a workflow from a natural language prompt
 */
export const generateWorkflow = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Fetch user's resources for context
        const resources = await prisma.resource.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                price: true,
                type: true,
                isActive: true,
            },
        });

        const result = await generateWorkflowFromPrompt(prompt, resources);

        return res.json(result);
    } catch (error: any) {
        console.error('Generate workflow error:', error);
        return res.status(500).json({ error: 'Failed to generate workflow', message: error.message });
    }
};
