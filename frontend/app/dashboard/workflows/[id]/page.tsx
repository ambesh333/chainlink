'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Play, Pause, Trash2, Loader2, Clock, Zap, FlaskConical, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getApiUrl } from '@/lib/config';
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas';
import ExecutionLog from '@/components/workflows/ExecutionLog';
import type { Node, Edge } from '@xyflow/react';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'DRAFT';
    definition: { nodes: Node[]; edges: Edge[] };
    schedule?: string;
    lastRunAt?: string;
    runCount: number;
    executions: any[];
}

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

export default function EditWorkflowPage() {
    const router = useRouter();
    const params = useParams();
    const workflowId = params.id as string;
    const { getToken } = useAuth();

    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [schedule, setSchedule] = useState('');
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const nodesRef = useRef<Node[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'builder' | 'executions'>('builder');
    const [testResult, setTestResult] = useState<{ success: boolean; log: string } | null>(null);
    const [validationError, setValidationError] = useState('');

    const getHeaders = () => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const fetchWorkflow = async () => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows/${workflowId}`, {
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                const wf = data.workflow;
                setWorkflow(wf);
                setName(wf.name);
                setDescription(wf.description || '');
                setSchedule(wf.schedule || '*/5 * * * *');
                setNodes(wf.definition?.nodes || []);
                setEdges(wf.definition?.edges || []);
            }
        } catch (error) {
            console.error('Failed to fetch workflow:', error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_URL = getApiUrl();
                const [wfRes, resRes] = await Promise.all([
                    fetch(`${API_URL}/workflows/${workflowId}`, {
                        headers: getHeaders(),
                        credentials: 'include',
                    }),
                    fetch(`${API_URL}/resources`, {
                        headers: getHeaders(),
                        credentials: 'include',
                    }),
                ]);

                if (wfRes.ok) {
                    const data = await wfRes.json();
                    const wf = data.workflow;
                    setWorkflow(wf);
                    setName(wf.name);
                    setDescription(wf.description || '');
                    setSchedule(wf.schedule || '*/5 * * * *');
                    const loadedNodes = wf.definition?.nodes || [];
                    const loadedEdges = wf.definition?.edges || [];
                    setNodes(loadedNodes);
                    setEdges(loadedEdges);
                    nodesRef.current = loadedNodes;
                    edgesRef.current = loadedEdges;
                }

                if (resRes.ok) {
                    const data = await resRes.json();
                    setResources(data.resources || []);
                }
            } catch (error) {
                console.error('Failed to fetch workflow:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [workflowId]);

    const handleCanvasChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        nodesRef.current = newNodes;
        edgesRef.current = newEdges;
        setValidationError('');
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setValidationError('');
        try {
            const API_URL = getApiUrl();
            const currentNodes = nodesRef.current;
            const currentEdges = edgesRef.current;
            await fetch(`${API_URL}/workflows/${workflowId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    description: description || null,
                    definition: { nodes: currentNodes, edges: currentEdges },
                    schedule,
                }),
            });
        } catch (error) {
            console.error('Failed to save workflow:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const err = validateWorkflow(currentNodes);
        if (err) { setValidationError(err); return; }

        // Save first, then test
        setIsTesting(true);
        setTestResult(null);
        setValidationError('');

        try {
            const API_URL = getApiUrl();

            // Save current state
            await fetch(`${API_URL}/workflows/${workflowId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    name,
                    description: description || null,
                    definition: { nodes: currentNodes, edges: currentEdges },
                    schedule,
                }),
            });

            // Run test
            const response = await fetch(`${API_URL}/workflows/${workflowId}/test`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok) {
                setTestResult({ success: true, log: data.log });
                // Refresh to get new execution in list
                await fetchWorkflow();
            } else {
                setTestResult({ success: false, log: data.error || 'Test failed' });
            }
        } catch (error: any) {
            setTestResult({ success: false, log: error.message || 'Test failed' });
        } finally {
            setIsTesting(false);
        }
    };

    const toggleStatus = async () => {
        if (!workflow) return;

        if (workflow.status !== 'ACTIVE') {
            const err = validateWorkflow(nodesRef.current);
            if (err) { setValidationError(err); return; }
        }

        const action = workflow.status === 'ACTIVE' ? 'pause' : 'activate';
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/workflows/${workflowId}/${action}`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setWorkflow((prev) => prev ? { ...prev, status: data.workflow.status } : prev);
            }
        } catch (error) {
            console.error('Failed to toggle workflow:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            const API_URL = getApiUrl();
            await fetch(`${API_URL}/workflows/${workflowId}`, {
                method: 'DELETE',
                headers: getHeaders(),
                credentials: 'include',
            });
            router.push('/dashboard/workflows');
        } catch (error) {
            console.error('Failed to delete workflow:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#375BD2]" size={24} />
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="text-center py-20 text-gray-500">
                Workflow not found
            </div>
        );
    }

    const statusColor = workflow.status === 'ACTIVE' ? '#10B981' : workflow.status === 'PAUSED' ? '#F59E0B' : '#6B7280';

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
                        onChange={(e) => setName(e.target.value)}
                        className="text-lg font-semibold bg-transparent text-white focus:outline-none border-b border-transparent focus:border-[#375BD2] pb-1 w-64"
                    />
                    <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ color: statusColor, background: `${statusColor}15` }}
                    >
                        {workflow.status}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 ml-2">
                        <span className="flex items-center gap-1"><Zap size={12} />{workflow.runCount} runs</span>
                        {workflow.lastRunAt && (
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Last: {new Date(workflow.lastRunAt).toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        title="Test workflow"
                    >
                        {isTesting ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                        Test
                    </button>
                    <button onClick={toggleStatus} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title={workflow.status === 'ACTIVE' ? 'Pause' : 'Activate'}>
                        {workflow.status === 'ACTIVE' ? (
                            <Pause size={16} className="text-yellow-500" />
                        ) : (
                            <Play size={16} className="text-green-500" />
                        )}
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Delete">
                        <Trash2 size={16} className="text-red-400" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#375BD2] text-white hover:bg-[#2B4ABF] transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                    </button>
                </div>
            </div>

            {/* Validation error */}
            {validationError && (
                <div className="mb-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    <AlertTriangle size={14} />
                    {validationError}
                </div>
            )}

            {/* Test result */}
            {testResult && (
                <div className={`mb-3 rounded-lg border ${testResult.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2">
                            {testResult.success ? (
                                <CheckCircle size={14} className="text-green-500" />
                            ) : (
                                <AlertTriangle size={14} className="text-red-400" />
                            )}
                            <span className={`text-sm font-medium ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                Test {testResult.success ? 'passed' : 'failed'}
                            </span>
                        </div>
                        <button
                            onClick={() => setTestResult(null)}
                            className="text-gray-500 hover:text-white text-xs"
                        >
                            Dismiss
                        </button>
                    </div>
                    <pre className="px-4 pb-3 text-[11px] text-gray-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {testResult.log}
                    </pre>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('builder')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                        activeTab === 'builder'
                            ? 'text-[#375BD2] border-b-2 border-[#375BD2]'
                            : 'text-gray-500 hover:text-white'
                    }`}
                >
                    Builder
                </button>
                <button
                    onClick={() => setActiveTab('executions')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                        activeTab === 'executions'
                            ? 'text-[#375BD2] border-b-2 border-[#375BD2]'
                            : 'text-gray-500 hover:text-white'
                    }`}
                >
                    Executions ({workflow.executions?.length || 0})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'builder' ? (
                <div className="flex-1 rounded-xl border border-white/10 overflow-hidden">
                    <WorkflowCanvas
                        initialNodes={nodes}
                        initialEdges={edges}
                        resources={resources}
                        onChange={handleCanvasChange}
                    />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <ExecutionLog executions={workflow.executions || []} />
                </div>
            )}
        </div>
    );
}
