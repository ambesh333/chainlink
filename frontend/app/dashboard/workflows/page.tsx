'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Brain, GitBranch, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import AIWorkflowGenerator from '@/components/workflows/AIWorkflowGenerator';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'DRAFT';
    lastRunAt?: string;
    runCount: number;
    createdAt: string;
}

export default function WorkflowsPage() {
    const router = useRouter();
    const { getToken } = useAuth();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAIGenerator, setShowAIGenerator] = useState(false);

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const fetchWorkflows = async () => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows`, {
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setWorkflows(data.workflows || []);
            }
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const deleteWorkflow = async (workflow: Workflow) => {
        if (!confirm(`Delete "${workflow.name}"? This cannot be undone.`)) return;
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows/${workflow.id}`, {
                method: 'DELETE',
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                fetchWorkflows();
            }
        } catch (error) {
            console.error('Failed to delete workflow:', error);
        }
    };

    const toggleWorkflow = async (workflow: Workflow) => {
        const action = workflow.status === 'ACTIVE' ? 'pause' : 'activate';
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows/${workflow.id}/${action}`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                fetchWorkflows();
            }
        } catch (error) {
            console.error('Failed to toggle workflow:', error);
        }
    };

    const handleAIGenerate = async (result: { nodes: any[]; edges: any[]; name: string; description: string; schedule: string }) => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    name: result.name,
                    description: result.description,
                    definition: { nodes: result.nodes, edges: result.edges },
                    schedule: result.schedule,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                router.push(`/dashboard/workflows/${data.workflow.id}`);
            }
        } catch (error) {
            console.error('Failed to create workflow:', error);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <GitBranch size={24} className="text-[#375BD2]" />
                        Workflows
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Automate pricing, resource management, and more with visual workflows
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAIGenerator(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#375BD2]/20 to-[#8B5CF6]/20 border border-[#375BD2]/30 text-white hover:border-[#375BD2]/50 transition-colors"
                    >
                        <Brain size={16} />
                        Generate with AI
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/workflows/new')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#375BD2] text-white hover:bg-[#2B4ABF] transition-colors"
                    >
                        <Plus size={16} />
                        Create Workflow
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-[#375BD2]" size={24} />
                </div>
            ) : workflows.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-[#375BD2]/10 flex items-center justify-center mx-auto mb-4">
                        <GitBranch size={28} className="text-[#375BD2]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No workflows yet</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        Create your first automation workflow to dynamically adjust resource prices,
                        manage availability, and more — powered by Chainlink CRE.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => setShowAIGenerator(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#375BD2]/20 to-[#8B5CF6]/20 border border-[#375BD2]/30 text-white hover:border-[#375BD2]/50 transition-colors"
                        >
                            <Brain size={16} />
                            Generate with AI
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/workflows/new')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#375BD2] text-white hover:bg-[#2B4ABF] transition-colors"
                        >
                            <Plus size={16} />
                            Create Workflow
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workflows.map((wf) => (
                        <WorkflowCard
                            key={wf.id}
                            id={wf.id}
                            name={wf.name}
                            description={wf.description}
                            status={wf.status}
                            lastRunAt={wf.lastRunAt}
                            runCount={wf.runCount}
                            onClick={() => router.push(`/dashboard/workflows/${wf.id}`)}
                            onToggle={() => toggleWorkflow(wf)}
                            onDelete={() => deleteWorkflow(wf)}
                        />
                    ))}
                </div>
            )}

            {/* AI Generator Modal */}
            <AIWorkflowGenerator
                isOpen={showAIGenerator}
                onClose={() => setShowAIGenerator(false)}
                onGenerate={handleAIGenerate}
                getToken={getToken}
            />
        </div>
    );
}
