'use client';
import React, { useState } from 'react';
import { X, Settings, Info, Trash2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { BlockNodeData } from './BlockNode';

interface Resource {
    id: string;
    title: string;
    price: number;
    type: string;
}

interface BlockConfigPanelProps {
    node: Node<BlockNodeData> | null;
    resources: Resource[];
    onUpdate: (nodeId: string, data: Partial<BlockNodeData>) => void;
    onClose: () => void;
    onDelete: (nodeId: string) => void;
}

const metricDescriptions: Record<string, string> = {
    accessCount: 'Total number of times agents have accessed (purchased) this resource',
    currentPrice: 'The current listed price of the resource in ETH',
    totalEarnings: 'Sum of all settled transaction amounts for this resource in ETH',
    settledCount: 'Number of fully settled (completed) transactions for this resource',
};

const blockDescriptions: Record<string, string> = {
    cron: 'Triggers the workflow on a recurring schedule using cron syntax. The CRE engine checks active workflows based on this interval.',
    fetch_stats: 'Fetches live metrics for a resource from the backend: access count, current price, total earnings, and settled transactions.',
    compare: 'Evaluates a condition against a metric from upstream data. Routes the workflow down the "true" or "false" branch.',
    price_analysis: 'Sends resource metrics to an AI model (Gemini/GPT/Claude) which analyzes demand patterns and recommends an optimal price.',
    update_price: 'Updates the resource price on the marketplace. Can use AI-recommended price, a fixed value, or a percentage change.',
    toggle_resource: 'Enables or disables a resource on the marketplace, controlling its visibility and purchasability.',
    telegram_notify: 'Sends a notification message via Telegram Bot API. Use template variables like {{currentPrice}}, {{accessCount}}, {{totalEarnings}}, {{settledCount}} in the message.',
    start: 'Marks the beginning of the workflow. Every workflow must have a start block as its entry point.',
    stop: 'Marks the end of the workflow. Signals that execution is complete for this branch.',
};

function InfoTooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false);

    return (
        <span className="relative inline-flex items-center ml-1">
            <Info
                size={12}
                className="text-gray-600 hover:text-gray-400 cursor-help transition-colors"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <span
                    className="fixed z-[9999] w-52 px-3 py-2 rounded-lg bg-[#1a1a24] border border-white/10 text-[11px] text-gray-300 leading-relaxed shadow-2xl"
                    style={{
                        pointerEvents: 'none',
                    }}
                    ref={(el) => {
                        if (el) {
                            const icon = el.previousElementSibling as HTMLElement;
                            if (icon) {
                                const rect = icon.getBoundingClientRect();
                                el.style.left = `${rect.left + rect.width / 2 - 104}px`;
                                el.style.top = `${rect.top - el.offsetHeight - 8}px`;
                            }
                        }
                    }}
                >
                    {text}
                </span>
            )}
        </span>
    );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
    return (
        <label className="flex items-center text-xs text-gray-500 mb-1">
            {label}
            {tooltip && <InfoTooltip text={tooltip} />}
        </label>
    );
}

export default function BlockConfigPanel({ node, resources, onUpdate, onClose, onDelete }: BlockConfigPanelProps) {
    if (!node) return null;

    const data = node.data as BlockNodeData;
    const config = data.config || {};
    const isStartOrStop = data.blockType === 'start' || data.blockType === 'stop';

    const updateConfig = (key: string, value: any) => {
        onUpdate(node.id, {
            config: { ...config, [key]: value },
        });
    };

    const updateLabel = (label: string) => {
        onUpdate(node.id, { label });
    };

    const blockDesc = blockDescriptions[data.blockType];

    return (
        <div className="w-72 bg-[#0d0d14] border-l border-white/10 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Settings size={14} className="text-gray-400" />
                    <span className="text-sm font-semibold text-white">Configure</span>
                </div>
                <div className="flex items-center gap-1">
                    {!isStartOrStop && (
                        <button
                            onClick={() => onDelete(node.id)}
                            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete block"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Block description */}
            {blockDesc && (
                <div className="mb-4 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-[11px] text-gray-500 leading-relaxed">{blockDesc}</p>
                </div>
            )}

            {/* Label */}
            <div className="mb-4">
                <FieldLabel label="Label" tooltip="Display name shown on the block in the canvas" />
                <input
                    type="text"
                    value={data.label || ''}
                    onChange={(e) => updateLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                />
            </div>

            {/* Type-specific config */}
            {data.blockType === 'cron' && (
                <div className="mb-4">
                    <FieldLabel label="Schedule (cron)" tooltip="Standard cron expression. Examples: */5 * * * * (every 5 min), 0 * * * * (every hour), 0 0 * * * (daily)" />
                    <input
                        type="text"
                        value={config.schedule || '*/5 * * * *'}
                        onChange={(e) => updateConfig('schedule', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white font-mono focus:border-[#375BD2] focus:outline-none"
                        placeholder="*/5 * * * *"
                    />
                    <p className="mt-1 text-[10px] text-gray-600">Every 5 minutes: */5 * * * *</p>
                </div>
            )}

            {data.blockType === 'fetch_stats' && (
                <div className="mb-4">
                    <FieldLabel label="Resource" tooltip="Select which resource to fetch live metrics for. Stats include access count, price, earnings, and settled transactions." />
                    <select
                        value={config.resourceId || ''}
                        onChange={(e) => updateConfig('resourceId', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                    >
                        <option value="">Select resource...</option>
                        {resources.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.title} ({r.price} ETH)
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {data.blockType === 'compare' && (
                <>
                    <div className="mb-3">
                        <FieldLabel label="Metric" tooltip="The data point to evaluate. Must come from an upstream Fetch Stats block." />
                        <select
                            value={config.metric || 'accessCount'}
                            onChange={(e) => updateConfig('metric', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            {Object.entries(metricDescriptions).map(([key]) => (
                                <option key={key} value={key}>
                                    {key === 'accessCount' ? 'Access Count' :
                                     key === 'currentPrice' ? 'Current Price' :
                                     key === 'totalEarnings' ? 'Total Earnings' :
                                     'Settled Count'}
                                </option>
                            ))}
                        </select>
                        {config.metric && metricDescriptions[config.metric] && (
                            <p className="mt-1 text-[10px] text-gray-600">{metricDescriptions[config.metric]}</p>
                        )}
                    </div>
                    <div className="mb-3">
                        <FieldLabel label="Operator" tooltip="Comparison operator. The condition evaluates: metric [operator] value" />
                        <select
                            value={config.operator || '>'}
                            onChange={(e) => updateConfig('operator', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            <option value=">">Greater than (&gt;)</option>
                            <option value="<">Less than (&lt;)</option>
                            <option value=">=">Greater or equal (&gt;=)</option>
                            <option value="<=">Less or equal (&lt;=)</option>
                            <option value="==">Equal (==)</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <FieldLabel label="Value" tooltip="The threshold value to compare the metric against" />
                        <input
                            type="number"
                            value={config.value ?? 10}
                            onChange={(e) => updateConfig('value', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        />
                    </div>
                </>
            )}

            {data.blockType === 'update_price' && (
                <>
                    <div className="mb-3">
                        <FieldLabel label="Resource" tooltip="Target resource whose price will be updated. Leave empty to use the resource from the upstream Fetch Stats block." />
                        <select
                            value={config.resourceId || ''}
                            onChange={(e) => updateConfig('resourceId', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            <option value="">From workflow context</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.title} ({r.price} ETH)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-3">
                        <FieldLabel label="Mode" tooltip="How the new price is determined. AI Recommended uses the upstream AI analysis block's suggestion." />
                        <select
                            value={config.mode || 'ai_recommended'}
                            onChange={(e) => updateConfig('mode', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            <option value="ai_recommended">AI Recommended</option>
                            <option value="fixed">Fixed Price</option>
                            <option value="percentage">Percentage Change</option>
                        </select>
                    </div>
                    {(config.mode === 'fixed' || config.mode === 'percentage') && (
                        <div className="mb-4">
                            <FieldLabel
                                label={config.mode === 'fixed' ? 'Price (ETH)' : 'Change (%)'}
                                tooltip={config.mode === 'fixed'
                                    ? 'The exact price to set in ETH'
                                    : 'Percentage to change the current price. Use positive values to increase, negative to decrease.'
                                }
                            />
                            <input
                                type="number"
                                step={config.mode === 'fixed' ? '0.0001' : '1'}
                                value={config.value ?? (config.mode === 'fixed' ? 0.001 : 15)}
                                onChange={(e) => updateConfig('value', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                            />
                        </div>
                    )}
                </>
            )}

            {data.blockType === 'toggle_resource' && (
                <>
                    <div className="mb-3">
                        <FieldLabel label="Resource" tooltip="Target resource to enable or disable. Leave empty to use the resource from the upstream Fetch Stats block." />
                        <select
                            value={config.resourceId || ''}
                            onChange={(e) => updateConfig('resourceId', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            <option value="">From workflow context</option>
                            {resources.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-4">
                        <FieldLabel label="Set Active" tooltip="Enable makes the resource visible and purchasable. Disable hides it from the marketplace." />
                        <select
                            value={config.active === false ? 'false' : 'true'}
                            onChange={(e) => updateConfig('active', e.target.value === 'true')}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                        >
                            <option value="true">Enable</option>
                            <option value="false">Disable</option>
                        </select>
                    </div>
                </>
            )}

            {data.blockType === 'telegram_notify' && (
                <>
                    <div className="mb-3">
                        <FieldLabel label="Bot Token (optional)" tooltip="Your Telegram bot token from @BotFather. Leave empty to use the server's default TELEGRAM_BOT_TOKEN environment variable." />
                        <input
                            type="text"
                            value={config.botToken || ''}
                            onChange={(e) => updateConfig('botToken', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                            placeholder="Falls back to env var"
                        />
                    </div>
                    <div className="mb-3">
                        <FieldLabel label="Chat ID" tooltip="The Telegram chat ID to send messages to. Get it from https://api.telegram.org/bot<TOKEN>/getUpdates after messaging your bot." />
                        <input
                            type="text"
                            value={config.chatId || ''}
                            onChange={(e) => updateConfig('chatId', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none"
                            placeholder="e.g. 123456789"
                        />
                    </div>
                    <div className="mb-4">
                        <FieldLabel label="Message" tooltip="Message template. Use {{currentPrice}}, {{accessCount}}, {{totalEarnings}}, {{settledCount}} for dynamic values." />
                        <textarea
                            value={config.message || ''}
                            onChange={(e) => updateConfig('message', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:border-[#375BD2] focus:outline-none resize-none"
                            placeholder="Price is {{currentPrice}} ETH with {{accessCount}} accesses"
                        />
                    </div>
                </>
            )}

            {data.blockType === 'price_analysis' && (
                <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <p className="text-xs text-gray-400">
                        AI will analyze demand metrics from upstream data nodes and recommend an optimal price.
                    </p>
                </div>
            )}

            {isStartOrStop && (
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-gray-400">
                        {data.blockType === 'start'
                            ? 'This is the entry point of the workflow. Connect it to the first action or trigger block.'
                            : 'This marks the end of this workflow branch. No further blocks will execute after this.'}
                    </p>
                </div>
            )}
        </div>
    );
}
