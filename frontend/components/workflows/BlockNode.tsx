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

const typeConfig: Record<string, { color: string; icon: React.ElementType }> = {
    trigger: { color: '#a78bfa', icon: Clock },
    data: { color: '#60a5fa', icon: Database },
    ai: { color: '#c084fc', icon: Brain },
    condition: { color: '#fbbf24', icon: GitBranch },
    action: { color: '#34d399', icon: Zap },
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
    const isCondition = nodeType === 'condition';

    const showInputHandle = !isStart;
    const showOutputHandle = !isStop;

    return (
        <div
            style={{
                background: selected
                    ? `linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))`
                    : `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))`,
                borderColor: selected ? config.color : `${config.color}44`,
                boxShadow: selected
                    ? `0 0 0 1px ${config.color}60, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)`
                    : `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)`,
            }}
            className="rounded-xl border px-4 py-3 min-w-[190px] backdrop-blur-xl transition-all duration-200 relative overflow-hidden"
        >
            {/* glassmorphism highlight strip */}
            <div
                style={{ background: `linear-gradient(90deg, ${config.color}20, transparent)` }}
                className="absolute inset-x-0 top-0 h-[1px]"
            />

            {showInputHandle && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !border-2 !rounded-full !-left-[6px]"
                    style={{ background: config.color, borderColor: `${config.color}60` }}
                />
            )}

            <div className="flex items-center gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                        background: `${config.color}18`,
                        boxShadow: `0 0 12px ${config.color}30`,
                        border: `1px solid ${config.color}30`,
                    }}
                >
                    <Icon size={16} style={{ color: config.color }} />
                </div>
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: `${config.color}cc` }}>
                        {isStart ? 'start' : isStop ? 'stop' : nodeType}
                    </div>
                    <div className="text-sm font-medium text-white/90 leading-tight">
                        {nodeData.label || nodeData.blockType}
                    </div>
                </div>
            </div>

            {nodeData.config && Object.keys(nodeData.config).length > 0 && !isStart && !isStop && (
                <div className="mt-2 text-[11px] text-white/40 truncate max-w-[180px]">
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
                isCondition ? (
                    <>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="true"
                            className="!w-3 !h-3 !border-2 !rounded-full !-right-[6px]"
                            style={{ background: '#34d399', borderColor: '#34d39980', top: '35%' }}
                        />
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="false"
                            className="!w-3 !h-3 !border-2 !rounded-full !-right-[6px]"
                            style={{ background: '#f87171', borderColor: '#f8717180', top: '65%' }}
                        />
                    </>
                ) : (
                    <Handle
                        type="source"
                        position={Position.Right}
                        className="!w-3 !h-3 !border-2 !rounded-full !-right-[6px]"
                        style={{ background: config.color, borderColor: `${config.color}60` }}
                    />
                )
            )}
        </div>
    );
}

export default memo(BlockNodeComponent);
