'use client';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
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
import CustomEdge from './CustomEdge';

const nodeTypes = {
    trigger: BlockNodeComponent,
    data: BlockNodeComponent,
    ai: BlockNodeComponent,
    condition: BlockNodeComponent,
    action: BlockNodeComponent,
};

const edgeTypes = {
    custom: CustomEdge,
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

const VERTICAL_SPACING = 160;
const CENTER_X = 400;

const DEFAULT_START_NODE: Node = {
    id: 'node_start',
    type: 'trigger',
    position: { x: CENTER_X, y: 40 },
    data: { blockType: 'start', label: 'Start', config: {} },
};

const DEFAULT_STOP_NODE: Node = {
    id: 'node_stop',
    type: 'action',
    position: { x: CENTER_X, y: 40 + VERTICAL_SPACING },
    data: { blockType: 'stop', label: 'Stop', config: {} },
};

function makeEdge(source: string, target: string, sourceHandle?: string): Edge {
    return {
        id: `edge_${source}_${target}${sourceHandle ? `_${sourceHandle}` : ''}`,
        source,
        target,
        sourceHandle: sourceHandle || undefined,
        type: 'custom',
        animated: true,
        style: { stroke: '#7c3aed44', strokeWidth: 2 },
    };
}

// Strip runtime-only data from edges before saving & deduplicate by id
function cleanEdgesForSave(edges: Edge[]): Edge[] {
    const seen = new Set<string>();
    const result: Edge[] = [];
    for (const e of edges) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        const { data, ...rest } = e;
        result.push(rest);
    }
    return result;
}

function migrateNodesToVertical(nodes: Node[]): Node[] {
    if (nodes.length < 2) return nodes;
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);

    if (xSpread > ySpread * 1.5 && ySpread < 100) {
        const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
        return sorted.map((node, i) => ({
            ...node,
            position: { x: CENTER_X, y: 40 + i * VERTICAL_SPACING },
        }));
    }
    return nodes;
}

function WorkflowCanvasInner({ initialNodes = [], initialEdges = [], resources, onChange }: WorkflowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [showInsertMenu, setShowInsertMenu] = useState<{
        edgeId: string;
        position: { x: number; y: number };
        screenPos: { x: number; y: number };
    } | null>(null);

    const seedNodes = React.useMemo(() => {
        if (initialNodes.length > 0) return migrateNodesToVertical(initialNodes);
        return [DEFAULT_START_NODE, DEFAULT_STOP_NODE];
    }, []);

    const seedEdges = React.useMemo(() => {
        if (initialEdges.length > 0) {
            const seen = new Set<string>();
            const deduped: Edge[] = [];
            for (const e of initialEdges) {
                if (!seen.has(e.id)) {
                    seen.add(e.id);
                    deduped.push({ ...e, type: 'custom' });
                }
            }
            return deduped;
        }
        return [makeEdge('node_start', 'node_stop')];
    }, []);

    const [nodes, setNodes, onNodesChange] = useNodesState(seedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(seedEdges);
    const [selectedNode, setSelectedNode] = useState<Node<BlockNodeData> | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Refs to always have the latest state for onChange
    const nodesRef = useRef<Node[]>(seedNodes);
    const edgesRef = useRef<Edge[]>(seedEdges);
    const onChangeRef = useRef(onChange);
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    // Single stable function to notify parent of changes (deferred to let React state settle)
    const notifyChange = useCallback(() => {
        setTimeout(() => {
            onChangeRef.current?.(nodesRef.current, cleanEdgesForSave(edgesRef.current));
        }, 0);
    }, []);

    // Keep edge data callbacks up to date
    useEffect(() => {
        setEdges((eds) =>
            eds.map((e) => ({
                ...e,
                type: 'custom',
                data: {
                    ...((e.data as Record<string, unknown>) || {}),
                    onDelete: handleDeleteEdge,
                    onAddBetween: handleAddBetween,
                },
            }))
        );
    }, [nodes.length]);

    const handleDeleteEdge = useCallback((edgeId: string) => {
        setEdges((eds) => eds.filter((e) => e.id !== edgeId));
        notifyChange();
    }, [setEdges, notifyChange]);

    const handleAddBetween = useCallback((edgeId: string, position: { x: number; y: number }) => {
        const wrapperRect = reactFlowWrapper.current?.getBoundingClientRect();
        if (!wrapperRect) return;

        setShowInsertMenu({
            edgeId,
            position,
            screenPos: {
                x: wrapperRect.left + wrapperRect.width / 2,
                y: wrapperRect.top + wrapperRect.height / 2,
            },
        });
    }, []);

    const insertBlockBetween = useCallback((template: BlockTemplate) => {
        if (!showInsertMenu) return;
        const { edgeId } = showInsertMenu;

        const currentEdges = edgesRef.current;
        const currentNodes = nodesRef.current;
        const edge = currentEdges.find((e) => e.id === edgeId);
        if (!edge) { setShowInsertMenu(null); return; }

        const sourceNode = currentNodes.find((n) => n.id === edge.source);
        const targetNode = currentNodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) { setShowInsertMenu(null); return; }

        const newPos = {
            x: (sourceNode.position.x + targetNode.position.x) / 2,
            y: (sourceNode.position.y + targetNode.position.y) / 2,
        };

        const id = `node_${nodeIdCounter++}`;
        const newNode: Node = {
            id,
            type: template.type,
            position: newPos,
            data: {
                blockType: template.blockType,
                label: template.label,
                config: getDefaultConfig(template.blockType),
            },
        };

        // Push target node and everything below it down
        setNodes((nds) => {
            const updatedNodes = nds.map((n) => {
                if (n.position.y >= targetNode.position.y) {
                    return { ...n, position: { ...n.position, y: n.position.y + VERTICAL_SPACING } };
                }
                return n;
            });
            return [...updatedNodes, newNode];
        });

        // Remove old edge, add two new edges
        setEdges((eds) => {
            const filtered = eds.filter((e) => e.id !== edgeId);
            const edge1 = makeEdge(edge.source, id, edge.sourceHandle || undefined);
            const edge2 = makeEdge(id, edge.target);
            return [...filtered, edge1, edge2].map((e) => ({
                ...e,
                type: 'custom' as const,
                data: {
                    ...((e.data as Record<string, unknown>) || {}),
                    onDelete: handleDeleteEdge,
                    onAddBetween: handleAddBetween,
                },
            }));
        });

        notifyChange();
        setShowInsertMenu(null);
    }, [showInsertMenu, setNodes, setEdges, handleDeleteEdge, handleAddBetween, notifyChange]);

    const onConnect: OnConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => {
                const newEdge = makeEdge(
                    params.source!,
                    params.target!,
                    params.sourceHandle || undefined,
                );
                const newEdgeWithData = {
                    ...newEdge,
                    data: {
                        onDelete: handleDeleteEdge,
                        onAddBetween: handleAddBetween,
                    },
                };
                return addEdge(newEdgeWithData, eds);
            });
            notifyChange();
        },
        [setEdges, handleDeleteEdge, handleAddBetween, notifyChange]
    );

    const handleNodesChange = useCallback(
        (changes: any) => {
            const filtered = changes.filter((c: any) => {
                if (c.type === 'remove') {
                    const node = nodesRef.current.find((n) => n.id === c.id);
                    const bd = node?.data as BlockNodeData | undefined;
                    if (bd?.blockType === 'start' || bd?.blockType === 'stop') return false;
                }
                return true;
            });
            onNodesChange(filtered);
            notifyChange();
        },
        [onNodesChange, notifyChange]
    );

    const handleEdgesChange = useCallback(
        (changes: any) => {
            onEdgesChange(changes);
            notifyChange();
        },
        [onEdgesChange, notifyChange]
    );

    const addBlock = useCallback(
        (template: BlockTemplate, position?: { x: number; y: number }) => {
            if (template.blockType === 'start' || template.blockType === 'stop') {
                const exists = nodesRef.current.some((n) => (n.data as BlockNodeData).blockType === template.blockType);
                if (exists) return;
            }

            const id = `node_${nodeIdCounter++}`;
            const currentNodes = nodesRef.current;

            const stopNode = currentNodes.find((n) => (n.data as BlockNodeData).blockType === 'stop');
            const nonFlowNodes = currentNodes.filter(
                (n) => (n.data as BlockNodeData).blockType !== 'start' && (n.data as BlockNodeData).blockType !== 'stop'
            );

            const pos = position || {
                x: CENTER_X,
                y: stopNode
                    ? stopNode.position.y
                    : 40 + (nonFlowNodes.length + 1) * VERTICAL_SPACING,
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

            // Push stop node down if we're inserting before it
            if (stopNode && !position) {
                setNodes((nds) => {
                    const updated = nds.map((n) => {
                        if ((n.data as BlockNodeData).blockType === 'stop') {
                            return { ...n, position: { ...n.position, y: n.position.y + VERTICAL_SPACING } };
                        }
                        return n;
                    });
                    return [...updated, newNode];
                });
            } else {
                setNodes((nds) => [...nds, newNode]);
            }

            // Auto-connect: find the last node before stop and connect
            const lastNonStop = currentNodes
                .filter((n) => (n.data as BlockNodeData).blockType !== 'stop')
                .sort((a, b) => a.position.y - b.position.y)
                .slice(-1)[0];

            if (lastNonStop && !position) {
                setEdges((eds) => {
                    // Remove any edge from lastNonStop to stop
                    const filtered = eds.filter((e) => {
                        if (e.source === lastNonStop.id && stopNode && e.target === stopNode.id) return false;
                        return true;
                    });
                    const edge1 = makeEdge(lastNonStop.id, id);
                    const edge2 = stopNode ? makeEdge(id, stopNode.id) : null;
                    return [...filtered, edge1, ...(edge2 ? [edge2] : [])].map((e) => ({
                        ...e,
                        type: 'custom' as const,
                        data: {
                            ...((e.data as Record<string, unknown>) || {}),
                            onDelete: handleDeleteEdge,
                            onAddBetween: handleAddBetween,
                        },
                    }));
                });
            }

            notifyChange();
        },
        [setNodes, setEdges, handleDeleteEdge, handleAddBetween, notifyChange]
    );

    const deleteNode = useCallback(
        (nodeId: string) => {
            const currentNodes = nodesRef.current;
            const currentEdges = edgesRef.current;
            const node = currentNodes.find((n) => n.id === nodeId);
            const bd = node?.data as BlockNodeData | undefined;
            if (bd?.blockType === 'start' || bd?.blockType === 'stop') return;

            // Find incoming and outgoing edges to reconnect
            const incomingEdges = currentEdges.filter((e) => e.target === nodeId);
            const outgoingEdges = currentEdges.filter((e) => e.source === nodeId);

            setNodes((nds) => nds.filter((n) => n.id !== nodeId));

            setEdges((eds) => {
                let updated = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);

                // Reconnect: each incoming source to each outgoing target
                for (const inEdge of incomingEdges) {
                    for (const outEdge of outgoingEdges) {
                        const reconnect = makeEdge(inEdge.source, outEdge.target, inEdge.sourceHandle || undefined);
                        updated.push({
                            ...reconnect,
                            data: {
                                onDelete: handleDeleteEdge,
                                onAddBetween: handleAddBetween,
                            },
                        });
                    }
                }

                return updated;
            });
            setSelectedNode(null);
            notifyChange();
        },
        [setNodes, setEdges, handleDeleteEdge, handleAddBetween, notifyChange]
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
        setShowInsertMenu(null);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setShowInsertMenu(null);
    }, []);

    const updateNodeData = useCallback(
        (nodeId: string, data: Partial<BlockNodeData>) => {
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === nodeId) {
                        return { ...n, data: { ...n.data, ...data } };
                    }
                    return n;
                })
            );

            setSelectedNode((prev) => {
                if (prev && prev.id === nodeId) {
                    return { ...prev, data: { ...prev.data, ...data } } as Node<BlockNodeData>;
                }
                return prev;
            });

            notifyChange();
        },
        [setNodes, notifyChange]
    );

    return (
        <div
            className="flex h-full relative"
            style={{
                background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(55,91,210,0.06) 0%, transparent 60%), #080810',
            }}
        >
            <BlockPalette onAddBlock={addBlock} />
            <div className="flex-1 relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    style={{ background: 'transparent' }}
                    deleteKeyCode={['Backspace', 'Delete']}
                    defaultEdgeOptions={{
                        type: 'custom',
                        animated: true,
                        style: { stroke: '#7c3aed44', strokeWidth: 2 },
                        data: {
                            onDelete: handleDeleteEdge,
                            onAddBetween: handleAddBetween,
                        },
                    }}
                    connectionLineStyle={{ stroke: '#375BD2', strokeWidth: 2 }}
                    snapToGrid
                    snapGrid={[20, 20]}
                >
                    <Background variant={BackgroundVariant.Dots} color="#ffffff18" gap={24} size={1.5} />
                    <Controls
                        className="!bg-[#0d0d14] !border-white/10 !rounded-lg [&>button]:!bg-[#0d0d14] [&>button]:!border-white/10 [&>button]:!text-white [&>button:hover]:!bg-white/5"
                    />
                    <MiniMap
                        nodeColor={(node) => {
                            const bd = node.data as BlockNodeData;
                            if (bd.blockType === 'start') return '#a78bfa';
                            if (bd.blockType === 'stop') return '#34d399';
                            const typeColors: Record<string, string> = {
                                trigger: '#a78bfa',
                                data: '#60a5fa',
                                ai: '#c084fc',
                                condition: '#fbbf24',
                                action: '#34d399',
                            };
                            return typeColors[node.type || ''] || '#6b7280';
                        }}
                        maskColor="rgba(8,8,16,0.85)"
                        style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8 }}
                        pannable
                        zoomable
                    />
                </ReactFlow>

                {/* Insert block menu (appears when clicking + on edge) */}
                {showInsertMenu && (
                    <InsertBlockMenu
                        onSelect={insertBlockBetween}
                        onClose={() => setShowInsertMenu(null)}
                    />
                )}
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

function InsertBlockMenu({
    onSelect,
    onClose,
}: {
    onSelect: (template: BlockTemplate) => void;
    onClose: () => void;
}) {
    const insertableBlocks: BlockTemplate[] = [
        { type: 'trigger', blockType: 'cron', label: 'Cron Schedule', description: 'Run on a schedule' },
        { type: 'data', blockType: 'fetch_stats', label: 'Fetch Stats', description: 'Get resource metrics' },
        { type: 'ai', blockType: 'price_analysis', label: 'Price Analysis', description: 'AI price recommendation' },
        { type: 'condition', blockType: 'compare', label: 'Compare Metric', description: 'Branch on condition' },
        { type: 'action', blockType: 'update_price', label: 'Update Price', description: 'Change resource price' },
        { type: 'action', blockType: 'toggle_resource', label: 'Toggle Resource', description: 'Enable/disable resource' },
        { type: 'action', blockType: 'telegram_notify', label: 'Telegram Notify', description: 'Send Telegram message' },
    ];

    const typeColors: Record<string, string> = {
        trigger: '#a78bfa',
        data: '#60a5fa',
        ai: '#c084fc',
        condition: '#fbbf24',
        action: '#34d399',
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-64 rounded-xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, rgba(18,18,28,0.98) 0%, rgba(12,12,20,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(55,91,210,0.15)',
                    backdropFilter: 'blur(24px)',
                }}
            >
                <div className="px-3 py-2 border-b border-white/5">
                    <span className="text-xs font-semibold text-gray-400">Insert Block</span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                    {insertableBlocks.map((block) => (
                        <button
                            key={block.blockType}
                            onClick={() => onSelect(block)}
                            className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                        >
                            <div
                                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                style={{ background: typeColors[block.type] }}
                            />
                            <div>
                                <div className="text-sm text-white/90 font-medium">{block.label}</div>
                                <div className="text-[11px] text-white/35">{block.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>
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
