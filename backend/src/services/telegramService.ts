/**
 * Telegram Service
 *
 * Sends messages via the Telegram Bot API. Used by workflow engine
 * telegram_notify action blocks.
 */

/**
 * Interpolates template variables like {{currentPrice}}, {{accessCount}}, etc.
 * with actual values from the workflow context.
 */
export function interpolateTemplate(
    template: string,
    context: Record<string, any>
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
        const value = context[key];
        return value !== undefined ? String(value) : `{{${key}}}`;
    });
}

/**
 * Sends a message to a Telegram chat via the Bot API.
 */
export async function sendTelegramMessage(
    botToken: string,
    chatId: string,
    message: string
): Promise<{ ok: boolean; description?: string }> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        }),
    });

    const data = await response.json() as { ok: boolean; description?: string };

    if (!data.ok) {
        console.error('[Telegram] Send failed:', data.description);
    }

    return { ok: data.ok, description: data.description };
}
