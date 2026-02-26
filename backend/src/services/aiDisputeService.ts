/**
 * AI Dispute Resolution Service
 *
 * Provider-agnostic AI service using LangChain for analyzing disputes.
 * Supports Google Gemini, OpenAI, and Anthropic models.
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

// ============= Types =============

export interface DisputeVerdict {
    isValid: boolean;
    reasoning: string;
    confidence: number;
}

export interface AnalysisInput {
    disputeReason: string;
    resourceTitle: string;
    resourceDescription?: string;
    resourceType: 'IMAGE' | 'VIDEO' | 'LINK';
    resourceContent?: string;
    merchantExplanation?: string;
}

type AIProvider = 'google' | 'openai' | 'anthropic';

// ============= Model Factory =============

function createModel(provider: AIProvider) {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
        throw new Error('AI_API_KEY environment variable is required');
    }

    switch (provider) {
        case 'google':
            return new ChatGoogleGenerativeAI({
                apiKey,
                model: 'gemini-2.0-flash',
                temperature: 0.3,
            });
        case 'openai':
            return new ChatOpenAI({
                apiKey,
                model: 'gpt-4o-mini',
                temperature: 0.3,
            });
        case 'anthropic':
            return new ChatAnthropic({
                apiKey,
                model: 'claude-sonnet-4-20250514',
                temperature: 0.3,
            });
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}

// ============= Image Analysis =============

export async function extractImageContext(base64Image: string, provider: AIProvider = 'google'): Promise<string> {
    const model = createModel(provider);
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const messages = [
        new SystemMessage('You are an image analyzer. Describe the image content in detail, focusing on the main subjects, setting, colors, and any text visible.'),
        new HumanMessage({
            content: [
                { type: 'text', text: 'Describe this image in detail:' },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${imageData}` }
                }
            ]
        })
    ];

    const response = await model.invoke(messages);
    return response.content as string;
}

// ============= Main Analysis Function =============

const SYSTEM_PROMPT = `You are an AI dispute resolution agent for a digital marketplace. Your job is to determine if a buyer's dispute claim is valid.

IMPORTANT GUIDELINES:
1. Analyze the dispute reason against the provided resource content objectively
2. Consider if the resource matches its title/description
3. Look for clear misrepresentation, broken content, or false advertising
4. Be fair to both parties - don't assume guilt without evidence
5. Provide clear, concise reasoning

You MUST respond with valid JSON matching this exact schema:
{
  "isValid": boolean,
  "reasoning": "string explaining your decision",
  "confidence": number between 0-100
}

Do NOT include any text before or after the JSON object.`;

function buildAnalysisPrompt(input: AnalysisInput, resourceContext: string): string {
    let prompt = `DISPUTE ANALYSIS REQUEST

DISPUTE CLAIM: "${input.disputeReason}"

RESOURCE INFORMATION:
- Title: ${input.resourceTitle}
- Type: ${input.resourceType}
${input.resourceDescription ? `- Description: ${input.resourceDescription}` : ''}

RESOURCE CONTENT/CONTEXT:
${resourceContext}
`;

    if (input.merchantExplanation) {
        prompt += `
MERCHANT'S RESPONSE:
"${input.merchantExplanation}"

Consider the merchant's explanation in your analysis. If it provides valid context that addresses the dispute, adjust your verdict accordingly.
`;
    }

    prompt += `
Based on the above, determine if the dispute is valid. Respond ONLY with the JSON object.`;

    return prompt;
}

export async function analyzeDispute(input: AnalysisInput): Promise<DisputeVerdict> {
    const provider = (process.env.AI_PROVIDER || 'google') as AIProvider;
    const model = createModel(provider);

    let resourceContext = '';

    switch (input.resourceType) {
        case 'IMAGE':
            if (input.resourceContent) {
                try {
                    resourceContext = await extractImageContext(input.resourceContent, provider);
                } catch (error) {
                    resourceContext = '[Image analysis failed - unable to extract visual content]';
                }
            } else {
                resourceContext = '[No image data provided]';
            }
            break;

        case 'VIDEO':
        case 'LINK':
            if (input.resourceContent) {
                resourceContext = `Resource URL: ${input.resourceContent}`;
            }
            break;

        default:
            resourceContext = input.resourceContent || '[No content provided]';
            break;
    }

    const analysisPrompt = buildAnalysisPrompt(input, resourceContext);

    const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(analysisPrompt)
    ];

    try {
        const response = await model.invoke(messages);
        const content = response.content as string;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('AI response did not contain valid JSON:', content);
            throw new Error('Invalid AI response format');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const verdictSchema = z.object({
            isValid: z.boolean(),
            reasoning: z.string(),
            confidence: z.number().min(0).max(100)
        });

        return verdictSchema.parse(parsed);

    } catch (error: any) {
        console.error('AI analysis failed:', error.message);
        throw new Error(`Dispute analysis failed: ${error.message}`);
    }
}
