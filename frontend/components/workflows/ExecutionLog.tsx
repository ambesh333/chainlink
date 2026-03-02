'use client';
import React from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';

interface Execution {
    id: string;
    status: string;
    log?: string;
    result?: any;
    txHash?: string;
    startedAt: string;
    completedAt?: string;
}

interface ExecutionLogProps {
    executions: Execution[];
}

const statusIcon: Record<string, React.ReactNode> = {
    completed: <CheckCircle size={14} className="text-green-500" />,
    failed: <XCircle size={14} className="text-red-500" />,
    running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
};

export default function ExecutionLog({ executions }: ExecutionLogProps) {
    if (executions.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 text-sm">
                No executions yet. Activate the workflow to start running.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {executions.map((exec) => (
                <div
                    key={exec.id}
                    className="bg-white/[0.02] border border-white/5 rounded-lg p-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {statusIcon[exec.status] || statusIcon.running}
                            <span className="text-sm font-medium text-white capitalize">
                                {exec.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {exec.txHash && (
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${exec.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-[#375BD2] hover:underline flex items-center gap-1"
                                >
                                    <ExternalLink size={10} />
                                    Tx
                                </a>
                            )}
                            <span className="text-[11px] text-gray-500">
                                {new Date(exec.startedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    {exec.log && (
                        <pre className="mt-2 text-[11px] text-gray-400 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                            {exec.log}
                        </pre>
                    )}
                </div>
            ))}
        </div>
    );
}
