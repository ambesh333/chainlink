'use client';
import React from 'react';
import { Clock, Database, Brain, GitBranch, Zap, PlayCircle, StopCircle, Send } from 'lucide-react';

export interface BlockTemplate {
    type: 'trigger' | 'data' | 'ai' | 'condition' | 'action';
    blockType: string;
    label: string;
    description: string;
}

const blocks: { category: string; color: string; icon: React.ElementType; items: BlockTemplate[] }[] = [
    {
        category: 'Flow',
        color: '#6366F1',
        icon: PlayCircle,
        items: [
            { type: 'trigger', blockType: 'start', label: 'Start', description: 'Workflow entry point' },
            { type: 'action', blockType: 'stop', label: 'Stop', description: 'Workflow end point' },
        ],
    },
    {
        category: 'Triggers',
        color: '#8B5CF6',
        icon: Clock,
        items: [
            { type: 'trigger', blockType: 'cron', label: 'Cron Schedule', description: 'Run on a schedule' },
        ],
    },
    {
        category: 'Data',
        color: '#375BD2',
        icon: Database,
        items: [
            { type: 'data', blockType: 'fetch_stats', label: 'Fetch Stats', description: 'Get resource metrics' },
        ],
    },
    {
        category: 'AI',
        color: '#7C3AED',
        icon: Brain,
        items: [
            { type: 'ai', blockType: 'price_analysis', label: 'Price Analysis', description: 'AI price recommendation' },
        ],
    },
    {
        category: 'Conditions',
        color: '#F59E0B',
        icon: GitBranch,
        items: [
            { type: 'condition', blockType: 'compare', label: 'Compare Metric', description: 'Branch on condition' },
        ],
    },
    {
        category: 'Actions',
        color: '#10B981',
        icon: Zap,
        items: [
            { type: 'action', blockType: 'update_price', label: 'Update Price', description: 'Change resource price' },
            { type: 'action', blockType: 'toggle_resource', label: 'Toggle Resource', description: 'Enable/disable resource' },
        ],
    },
    {
        category: 'Notifications',
        color: '#3B82F6',
        icon: Send,
        items: [
            { type: 'action', blockType: 'telegram_notify', label: 'Telegram Notify', description: 'Send message via Telegram bot' },
        ],
    },
];

interface BlockPaletteProps {
    onAddBlock: (template: BlockTemplate) => void;
}

export default function BlockPalette({ onAddBlock }: BlockPaletteProps) {
    const onDragStart = (event: React.DragEvent, template: BlockTemplate) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            className="w-60 overflow-y-auto p-4 flex flex-col gap-5 relative z-10"
            style={{
                background: 'linear-gradient(180deg, rgba(12,11,22,0.95) 0%, rgba(8,8,16,0.92) 100%)',
                backdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
            }}
        >
            <div
                className="text-xs font-bold uppercase tracking-widest pb-2"
                style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
                Blocks
            </div>

            {blocks.map((group) => {
                const Icon = group.icon;
                return (
                    <div key={group.category}>
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ background: `${group.color}18`, boxShadow: `0 0 8px ${group.color}30` }}
                            >
                                <Icon size={11} style={{ color: group.color }} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: `${group.color}cc` }}>
                                {group.category}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {group.items.map((item) => (
                                <div
                                    key={item.blockType}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, item)}
                                    onClick={() => onAddBlock(item)}
                                    className="px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 group"
                                    style={{
                                        background: `linear-gradient(135deg, ${group.color}10, ${group.color}05)`,
                                        border: `1px solid ${group.color}20`,
                                        backdropFilter: 'blur(8px)',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.border = `1px solid ${group.color}50`;
                                        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${group.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`;
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.border = `1px solid ${group.color}20`;
                                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                    }}
                                >
                                    <div className="text-sm font-medium text-white/85">{item.label}</div>
                                    <div className="text-[11px] text-white/35 mt-0.5">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
