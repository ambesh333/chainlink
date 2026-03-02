/**
 * AI Pricing Analysis Service
 *
 * Analyzes resource demand metrics and recommends price adjustments.
 * Reuses the provider-agnostic model factory pattern from aiDisputeService.
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

type AIProvider = 'google' | 'openai' | 'anthropic';

function createModel(provider: AIProvider) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) throw new Error('AI_API_KEY environment variable is required');

    switch (provider) {
        case 'google':
            return new ChatGoogleGenerativeAI({ apiKey, model: 'gemini-2.0-flash', temperature: 0.3 });
        case 'openai':
            return new ChatOpenAI({ apiKey, model: 'gpt-4o-mini', temperature: 0.3 });
        case 'anthropic':
            return new ChatAnthropic({ apiKey, model: 'claude-sonnet-4-20250514', temperature: 0.3 });
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}

export interface PricingInput {
    resourceId: string;
    currentPrice: number;
    accessCount: number;
    totalEarnings: number;
    settledCount: number;
}

export interface PricingAnalysis {
    recommendedPrice: number;
    changePercent: number;
    reasoning: string;
    confidence: number;
    action: 'increase' | 'decrease' | 'hold';
}

const SYSTEM_PROMPT = `You are an AI pricing analyst for a decentralized data marketplace. Your job is to analyze demand metrics for a digital resource and recommend optimal pricing.

GUIDELINES:
1. Higher access counts with good settlement rates suggest increasing price
2. Low or declining access suggests holding or slightly reducing price
3. Consider the ratio of settled vs pending transactions
4. Price changes should be gradual (5-25% adjustments)
5. Never recommend a price below 0.0001 ETH

You MUST respond with valid JSON matching this exact schema:
{
  "recommendedPrice": number,
  "changePercent": number (positive for increase, negative for decrease),
  "reasoning": "string explaining your recommendation",
  "confidence": number between 0-100,
  "action": "increase" | "decrease" | "hold"
}

Do NOT include any text before or after the JSON object.`;

export async function analyzePricing(input: PricingInput): Promise<PricingAnalysis> {
    const provider = (process.env.AI_PROVIDER || 'google') as AIProvider;
    const model = createModel(provider);

    const prompt = `PRICING ANALYSIS REQUEST

RESOURCE METRICS:
- Resource ID: ${input.resourceId}
- Current Price: ${input.currentPrice} ETH
- Total Access Count: ${input.accessCount}
- Settled Transactions: ${input.settledCount}
- Total Earnings: ${input.totalEarnings} ETH

Based on these metrics, recommend an optimal price adjustment. Respond ONLY with the JSON object.`;

    const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(prompt),
    ];

    try {
        const response = await model.invoke(messages);
        const content = response.content as string;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const parsed = JSON.parse(jsonMatch[0]);

        const schema = z.object({
            recommendedPrice: z.number(),
            changePercent: z.number(),
            reasoning: z.string(),
            confidence: z.number().min(0).max(100),
            action: z.enum(['increase', 'decrease', 'hold']),
        });

        return schema.parse(parsed);
    } catch (error: any) {
        console.error('AI pricing analysis failed:', error.message);
        throw new Error(`Pricing analysis failed: ${error.message}`);
    }
}
