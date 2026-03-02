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
        <div className="w-60 bg-[#0d0d14] border-r border-white/10 overflow-y-auto p-4 flex flex-col gap-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocks</div>

            {blocks.map((group) => {
                const Icon = group.icon;
                return (
                    <div key={group.category}>
                        <div className="flex items-center gap-2 mb-2">
                            <Icon size={14} style={{ color: group.color }} />
                            <span className="text-xs font-semibold" style={{ color: group.color }}>
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
                                    className="px-3 py-2 rounded-lg border border-white/5 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors"
                                    style={{ background: `${group.color}08` }}
                                >
                                    <div className="text-sm font-medium text-white">{item.label}</div>
                                    <div className="text-[11px] text-gray-500">{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
