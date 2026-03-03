'use client';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    addEdge,
    useNodesState,
    useEdgesState,
    type Connection,
    type Edge,
    type Node,
    type OnConnect,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BlockNodeComponent, { type BlockNodeData } from './BlockNode';
import BlockPalette, { type BlockTemplate } from './BlockPalette';
import BlockConfigPanel from './BlockConfigPanel';

const nodeTypes = {
    trigger: BlockNodeComponent,
    data: BlockNodeComponent,
    ai: BlockNodeComponent,
    condition: BlockNodeComponent,
    action: BlockNodeComponent,
};

interface Resource {
    id: string;
    title: string;
    price: number;
    type: string;
}

interface WorkflowCanvasProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    resources: Resource[];
    onChange?: (nodes: Node[], edges: Edge[]) => void;
}

let nodeIdCounter = 100;

const DEFAULT_START_NODE: Node = {
    id: 'node_start',
    type: 'trigger',
    position: { x: 60, y: 200 },
    data: { blockType: 'start', label: 'Start', config: {} },
};

const DEFAULT_STOP_NODE: Node = {
    id: 'node_stop',
    type: 'action',
    position: { x: 700, y: 200 },
    data: { blockType: 'stop', label: 'Stop', config: {} },
};

function WorkflowCanvasInner({ initialNodes = [], initialEdges = [], resources, onChange }: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // Auto-inject Start/Stop if not present in initialNodes
    const seedNodes = React.useMemo(() => {
        if (initialNodes.length > 0) return initialNodes;
        return [DEFAULT_START_NODE, DEFAULT_STOP_NODE];
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState(seedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node<BlockNodeData> | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const onConnect: OnConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const newEdges = addEdge(
                    {
                        ...params,
                        type: 'smoothstep',
                        style: { stroke: '#7c3aed55', strokeWidth: 2 },
                        animated: true,
                    },
                    eds
                );
                onChange?.(nodes, newEdges);
                return newEdges;
            });
        },
        [setEdges, nodes, onChange]
    );

    const handleNodesChange = useCallback(
        (changes: any) => {
            // Prevent deleting start/stop nodes via keyboard
            const filtered = changes.filter((c: any) => {
                if (c.type === 'remove') {
                    const node = nodes.find((n) => n.id === c.id);
                    const bd = node?.data as BlockNodeData | undefined;
                    if (bd?.blockType === 'start' || bd?.blockType === 'stop') return false;
                }
                return true;
            });
            onNodesChange(filtered);
            setTimeout(() => onChange?.(nodes, edges), 0);
        },
        [onNodesChange, nodes, edges, onChange]
    );

    const addBlock = useCallback(
        (template: BlockTemplate, position?: { x: number; y: number }) => {
            // Prevent adding duplicate start/stop
            if (template.blockType === 'start' || template.blockType === 'stop') {
                const exists = nodes.some((n) => (n.data as BlockNodeData).blockType === template.blockType);
                if (exists) return;
            }

            const id = `node_${nodeIdCounter++}`;
            // Place between start and stop
            const nonFlowNodes = nodes.filter(
                (n) => (n.data as BlockNodeData).blockType !== 'start' && (n.data as BlockNodeData).blockType !== 'stop'
            );
            const pos = position || {
                x: 260 + nonFlowNodes.length * 220,
                y: 200,
            };

            const newNode: Node = {
                id,
                type: template.type,
                position: pos,
                data: {
                    blockType: template.blockType,
                    label: template.label,
                    config: getDefaultConfig(template.blockType),
                },
            };

            setNodes((nds) => {
                const updated = [...nds, newNode];
                onChange?.(updated, edges);
                return updated;
            });

            // Auto-connect to the last non-stop node
            const lastNode = nodes.filter((n) => (n.data as BlockNodeData).blockType !== 'stop').slice(-1)[0];
            if (lastNode) {
                setEdges((eds) => {
                    const newEdge: Edge = {
                        id: `edge_${lastNode.id}_${id}`,
                        source: lastNode.id,
                        target: id,
                        type: 'smoothstep',
                        style: { stroke: '#7c3aed55', strokeWidth: 2 },
                        animated: true,
                    };
                    const updated = [...eds, newEdge];
                    onChange?.(nodes, updated);
                    return updated;
                });
            }
        },
        [nodes, edges, setNodes, setEdges, onChange]
    );

    const deleteNode = useCallback(
        (nodeId: string) => {
            // Never delete start/stop
            const node = nodes.find((n) => n.id === nodeId);
            const bd = node?.data as BlockNodeData | undefined;
            if (bd?.blockType === 'start' || bd?.blockType === 'stop') return;

            setNodes((nds) => {
                const updated = nds.filter((n) => n.id !== nodeId);
                onChange?.(updated, edges);
                return updated;
            });
            setEdges((eds) => {
                const updated = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
                onChange?.(nodes, updated);
                return updated;
            });
            setSelectedNode(null);
        },
        [nodes, edges, setNodes, setEdges, onChange]
    );

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const data = event.dataTransfer.getData('application/reactflow');
            if (!data || !reactFlowInstance) return;

            const template: BlockTemplate = JSON.parse(data);
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addBlock(template, position);
        },
        [reactFlowInstance, addBlock]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node as Node<BlockNodeData>);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const updateNodeData = useCallback(
        (nodeId: string, data: Partial<BlockNodeData>) => {
            setNodes((nds) => {
                const updated = nds.map((n) => {
                    if (n.id === nodeId) {
                        return {
                            ...n,
                            data: { ...n.data, ...data },
                        };
                    }
                    return n;
                });
                onChange?.(updated, edges);
                return updated;
            });

            setSelectedNode((prev) => {
                if (prev && prev.id === nodeId) {
                    return { ...prev, data: { ...prev.data, ...data } } as Node<BlockNodeData>;
                }
                return prev;
            });
        },
        [setNodes, edges, onChange]
    );

    return (
        <div
            className="flex h-full"
            style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(55,91,210,0.06) 0%, transparent 60%), #080810',
            }}
        >
            <BlockPalette onAddBlock={addBlock} />
            <div className="flex-1" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    style={{ background: 'transparent' }}
                    deleteKeyCode={['Backspace', 'Delete']}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        style: { stroke: '#7c3aed55', strokeWidth: 2 },
                        animated: true,
                    }}
                >
                    <Background variant={BackgroundVariant.Dots} color="#ffffff18" gap={24} size={1.5} />
                    <Controls
                        className="!bg-[#0d0d14] !border-white/10 !rounded-lg [&>button]:!bg-[#0d0d14] [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-white/5"
                    />
                </ReactFlow>
            </div>
            {selectedNode && (
                <BlockConfigPanel
                    node={selectedNode}
                    resources={resources}
                    onUpdate={updateNodeData}
                    onClose={() => setSelectedNode(null)}
                    onDelete={deleteNode}
                />
            )}
        </div>
    );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInner {...props} />
        </ReactFlowProvider>
    );
}

function getDefaultConfig(blockType: string): Record<string, any> {
    switch (blockType) {
        case 'cron':
            return { schedule: '*/5 * * * *' };
        case 'fetch_stats':
            return { resourceId: '' };
        case 'compare':
            return { metric: 'accessCount', operator: '>', value: 10 };
        case 'price_analysis':
            return {};
        case 'update_price':
            return { mode: 'ai_recommended' };
        case 'toggle_resource':
            return { active: true };
        case 'start':
        case 'stop':
            return {};
        default:
            return {};
    }
}
