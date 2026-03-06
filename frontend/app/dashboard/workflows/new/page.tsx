'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Loader2, FlaskConical, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas';
import type { Node, Edge } from '@xyflow/react';

interface Resource {
    id: string;
    title: string;
    price: number;
    type: string;
}

function validateWorkflow(nodes: Node[]): string | null {
    const hasStart = nodes.some((n: any) => n.data?.blockType === 'start');
    const hasStop = nodes.some((n: any) => n.data?.blockType === 'stop');
    if (!hasStart) return 'Workflow must have a Start block';
    if (!hasStop) return 'Workflow must have a Stop block';
    if (nodes.length < 3) return 'Add at least one block between Start and Stop';
    return null;
}

export default function NewWorkflowPage() {
    const router = useRouter();
    const { getToken } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [schedule, setSchedule] = useState('*/5 * * * *');
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const nodesRef = useRef<Node[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const API_URL = getApiUrl();
                const response = await fetch(`${API_URL}/resources`, {
                    headers: getHeaders(),
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setResources(data.resources || []);
                }
            } catch (error) {
                console.error('Failed to fetch resources:', error);
            }
        };
        fetchResources();
    }, []);

    const handleCanvasChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        nodesRef.current = newNodes;
        edgesRef.current = newEdges;
        setSaveError('');
    }, []);

    const handleSave = async (status: 'DRAFT' | 'ACTIVE' = 'DRAFT') => {
        if (!name.trim()) {
            setSaveError('Workflow name is required');
            return;
        }

        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;

        // Validate start/stop for non-draft saves
        if (status === 'ACTIVE') {
            const err = validateWorkflow(currentNodes);
            if (err) { setSaveError(err); return; }
        }

        setIsSaving(true);
        setSaveError('');
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    description: description || null,
                    definition: { nodes: currentNodes, edges: currentEdges },
                    schedule,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                if (status === 'ACTIVE') {
                    await fetch(`${API_URL}/workflows/${data.workflow.id}/activate`, {
                        method: 'POST',
                        headers: getHeaders(),
                        credentials: 'include',
                    });
                }

                router.push(`/dashboard/workflows/${data.workflow.id}`);
            }
        } catch (error) {
            console.error('Failed to save workflow:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)]">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/workflows')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setSaveError(''); }}
                        placeholder="Workflow name..."
                        className="text-lg font-semibold bg-transparent text-white placeholder-gray-600 focus:outline-none border-b border-transparent focus:border-[#375BD2] pb-1 w-64"
                    />
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="text-sm bg-transparent text-gray-400 placeholder-gray-700 focus:outline-none border-b border-transparent focus:border-white/20 pb-1 w-64"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSave('DRAFT')}
                        disabled={!name.trim() || isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSave('ACTIVE')}
                        disabled={!name.trim() || isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#375BD2] text-white hover:bg-[#2B4ABF] transition-colors disabled:opacity-50"
                    >
                        Save & Activate
                    </button>
                </div>
            </div>

            {/* Validation error */}
            {saveError && (
                <div className="mb-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    <AlertTriangle size={14} />
                    {saveError}
                </div>
            )}

            {/* Canvas */}
            <div className="flex-1 rounded-xl border border-white/10 overflow-hidden">
                <WorkflowCanvas
                    resources={resources}
                    onChange={handleCanvasChange}
                />
            </div>
        </div>
    );
}
