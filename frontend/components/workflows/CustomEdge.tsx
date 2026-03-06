'use client';
import React, { useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';
import { Plus, X } from 'lucide-react';

interface CustomEdgeData {
    onDelete?: (edgeId: string) => void;
    onAddBetween?: (edgeId: string, position: { x: number; y: number }) => void;
    [key: string]: unknown;
}

export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    selected,
}: EdgeProps) {
    const [hovered, setHovered] = useState(false);
    const edgeData = data as CustomEdgeData | undefined;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16,
    });

    const isActive = hovered || selected;

    return (
        <>
            {/* Invisible wider path for easier hover/click */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ cursor: 'pointer' }}
            />
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    ...style,
                    stroke: isActive ? '#375BD2' : '#7c3aed44',
                    strokeWidth: isActive ? 2.5 : 2,
                    transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
            />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan"
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: isActive ? 1 : 0,
                        transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {/* Add block between button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            edgeData?.onAddBetween?.(id, { x: labelX, y: labelY });
                        }}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110"
                        style={{
                            background: '#375BD2',
                            border: '2px solid #0d0d14',
                            boxShadow: '0 2px 8px rgba(55,91,210,0.4)',
                        }}
                        title="Add block here"
                    >
                        <Plus size={12} color="white" strokeWidth={3} />
                    </button>
                    {/* Delete connection button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            edgeData?.onDelete?.(id);
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110"
                        style={{
                            background: '#1a1a24',
                            border: '1.5px solid rgba(248,113,113,0.4)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                        title="Delete connection"
                    >
                        <X size={10} color="#f87171" strokeWidth={3} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
