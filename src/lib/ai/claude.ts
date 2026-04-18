import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

/** @see docs/04-ai-engine.md — 模型預設可環境覆寫 */
export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';
}

export async function callClaude(
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  },
): Promise<string> {
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
  return block.type === 'text' ? block.text : '';
}

export async function callClaudeJSON<T>(
  prompt: string,
  options?: {
    imageBase64?: string;
    imageMediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  },
): Promise<T> {
  const fullPrompt = `${prompt}\n\n只回傳 JSON，不加 markdown code block 或任何說明文字。`;
  const text = await callClaude(fullPrompt, options);
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim()) as T;
  } catch {
    throw new Error(`Claude 回傳的不是有效 JSON：${text.slice(0, 200)}`);
  }
}
