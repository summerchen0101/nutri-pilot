import Anthropic from '@anthropic-ai/sdk';

import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

/** @see docs/04-ai-engine.md — 模型預設可環境覆寫 */
export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
}

function usageFromResponse(
  response: Anthropic.Messages.Message,
): ClaudeTokenUsage | null {
  const u = response.usage;
  if (
    u &&
    typeof u.input_tokens === 'number' &&
    typeof u.output_tokens === 'number'
  ) {
    return {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
    };
  }
  return null;
}

export async function callClaudeWithMetadata(
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  },
): Promise<{ text: string; usage: ClaudeTokenUsage | null }> {
  const content: Anthropic.MessageParam['content'] = [];

  if (options?.imageBase64) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: options.imageMediaType ?? 'image/jpeg',
        data: options.imageBase64,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model: anthropicModel(),
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });

  const block = response.content[0];
  const text = block.type === 'text' ? block.text : '';
  return { text, usage: usageFromResponse(response) };
}

export async function callClaude(
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  },
): Promise<string> {
  const { text } = await callClaudeWithMetadata(prompt, options);
  return text;
}

export async function callClaudeJSON<T>(
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  },
): Promise<{ data: T; usage: ClaudeTokenUsage | null }> {
  const fullPrompt = `${prompt}\n\n只回傳 JSON，不加 markdown code block 或任何說明文字。`;
  const { text, usage } = await callClaudeWithMetadata(fullPrompt, options);
  try {
    const data = JSON.parse(text.replace(/```json|```/g, '').trim()) as T;
    return { data, usage };
  } catch {
    throw new Error(`Claude 回傳的不是有效 JSON：${text.slice(0, 200)}`);
  }
}
