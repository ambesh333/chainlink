'use client';
import React, { useState } from 'react';
import { Brain, Loader2, X, Sparkles } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface AIWorkflowGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (result: { nodes: any[]; edges: any[]; name: string; description: string; schedule: string }) => void;
    getToken: () => string | null;
}

const EXAMPLE_PROMPTS = [
    'Increase price 15% when access count exceeds 10',
    'Use AI to optimize pricing based on demand every hour',
    'Disable resource when earnings exceed 0.5 ETH',
];

export default function AIWorkflowGenerator({ isOpen, onClose, onGenerate, getToken }: AIWorkflowGeneratorProps) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const API_URL = getApiUrl();
            const token = getToken();
            const response = await fetch(`${API_URL}/workflows/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Generation failed');
            }

            const result = await response.json();
            onGenerate(result);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to generate workflow');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d0d14] border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#375BD2] to-[#8B5CF6] flex items-center justify-center">
                            <Brain size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">AI Workflow Generator</h3>
                            <p className="text-[11px] text-gray-500">Describe your automation in plain English</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Increase price 15% when access count exceeds 10..."
                        className="w-full h-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:border-[#375BD2] focus:outline-none resize-none"
                    />

                    {/* Example prompts */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {EXAMPLE_PROMPTS.map((ex) => (
                            <button
                                key={ex}
                                onClick={() => setPrompt(ex)}
                                className="px-3 py-1 rounded-full text-[11px] text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <Sparkles size={10} className="inline mr-1" />
                                {ex}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <p className="mt-3 text-xs text-red-400">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-5 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isLoading}
                        className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#375BD2] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Brain size={14} />
                                Generate Workflow
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
