'use client';
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, Database, Brain, GitBranch, Zap, PlayCircle, StopCircle, Send } from 'lucide-react';

export interface BlockNodeData {
    blockType: string;
    label: string;
    config: Record<string, any>;
    [key: string]: unknown;
}

const typeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
    trigger: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', icon: Clock },
    data: { color: '#375BD2', bg: 'rgba(55,91,210,0.1)', border: 'rgba(55,91,210,0.3)', icon: Database },
    ai: { color: '#7C3AED', bg: 'linear-gradient(135deg, rgba(55,91,210,0.1), rgba(139,92,246,0.1))', border: 'rgba(124,58,237,0.3)', icon: Brain },
    condition: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: GitBranch },
    action: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: Zap },
};

const blockTypeIcons: Record<string, React.ElementType> = {
    start: PlayCircle,
    stop: StopCircle,
    telegram_notify: Send,
};

function BlockNodeComponent({ data, type, selected }: NodeProps) {
    const nodeType = (type || 'trigger') as string;
    const nodeData = data as BlockNodeData;
    const config = typeConfig[nodeType] || typeConfig.trigger;
    const Icon = blockTypeIcons[nodeData.blockType] || config.icon;

    const isStart = nodeData.blockType === 'start';
    const isStop = nodeData.blockType === 'stop';

    // Only the start block has no input handle. All others (including cron) accept inputs.
    const showInputHandle = !isStart;
    // Only the stop block has no output handle.
    const showOutputHandle = !isStop;

    return (
        <div
            style={{
                background: config.bg,
                borderColor: selected ? config.color : config.border,
                boxShadow: selected ? `0 0 20px ${config.color}40` : 'none',
            }}
            className="rounded-xl border-2 px-4 py-3 min-w-[200px] backdrop-blur-sm transition-all"
        >
            {showInputHandle && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !border-2 !rounded-full"
                    style={{ background: config.color, borderColor: config.border }}
                />
            )}

            <div className="flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${config.color}20` }}
                >
                    <Icon size={16} style={{ color: config.color }} />
                </div>
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
                        {isStart ? 'start' : isStop ? 'stop' : nodeType}
                    </div>
                    <div className="text-sm font-medium text-white">
                        {nodeData.label || nodeData.blockType}
                    </div>
                </div>
            </div>

            {nodeData.config && Object.keys(nodeData.config).length > 0 && !isStart && !isStop && (
                <div className="mt-2 text-[11px] text-gray-400 truncate max-w-[180px]">
                    {nodeData.blockType === 'cron' && nodeData.config.schedule && (
                        <span>Every {nodeData.config.schedule}</span>
                    )}
                    {nodeData.blockType === 'compare' && (
                        <span>{nodeData.config.metric} {nodeData.config.operator} {nodeData.config.value}</span>
                    )}
                    {nodeData.blockType === 'update_price' && nodeData.config.mode && (
                        <span>Mode: {nodeData.config.mode}</span>
                    )}
                    {nodeData.blockType === 'telegram_notify' && nodeData.config.chatId && (
                        <span>Chat: {nodeData.config.chatId}</span>
                    )}
                </div>
            )}

            {showOutputHandle && (
                nodeType === 'condition' ? (
                    <>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="true"
                            className="!w-3 !h-3 !border-2 !rounded-full"
                            style={{ background: '#10B981', borderColor: '#10B98180', left: '30%' }}
                        />
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="false"
                            className="!w-3 !h-3 !border-2 !rounded-full"
                            style={{ background: '#EF4444', borderColor: '#EF444480', left: '70%' }}
                        />
                    </>
                ) : (
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        className="!w-3 !h-3 !border-2 !rounded-full"
                        style={{ background: config.color, borderColor: config.border }}
                    />
                )
            )}
        </div>
    );
}

export default memo(BlockNodeComponent);
