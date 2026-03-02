'use client';
import React from 'react';
import { Play, Pause, Clock, Zap, Trash2 } from 'lucide-react';

interface WorkflowCardProps {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'DRAFT';
    lastRunAt?: string;
    runCount: number;
    onClick: () => void;
    onToggle: () => void;
    onDelete: () => void;
}

const statusConfig = {
    ACTIVE: { label: 'Active', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    PAUSED: { label: 'Paused', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    DRAFT: { label: 'Draft', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

export default function WorkflowCard({
    name,
    description,
    status,
    lastRunAt,
    runCount,
    onClick,
    onToggle,
    onDelete,
}: WorkflowCardProps) {
    const cfg = statusConfig[status];

    return (
        <div
            onClick={onClick}
            className="group relative bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:border-white/15 transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
                    {description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                    <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ color: cfg.color, background: cfg.bg }}
                    >
                        {cfg.label}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                        title={status === 'ACTIVE' ? 'Pause workflow' : 'Activate workflow'}
                    >
                        {status === 'ACTIVE' ? (
                            <Pause size={14} className="text-yellow-500" />
                        ) : (
                            <Play size={14} className="text-green-500" />
                        )}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete workflow"
                    >
                        <Trash2 size={14} className="text-red-400" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-gray-500">
                <div className="flex items-center gap-1">
                    <Zap size={12} />
                    <span>{runCount} runs</span>
                </div>
                {lastRunAt && (
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{new Date(lastRunAt).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
