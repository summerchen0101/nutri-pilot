/** Claude Vision HTTP call（Edge Functions / Deno）。 */
import type { TokenUsage } from "./token-usage-to-ai-quota.ts";

export async function anthropicVision(params: {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  base64: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ text: string; usage: TokenUsage | null }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const model =
    Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: params.mediaType,
                data: params.base64,
              },
            },
            {
              type: "text",
              text:
                params.prompt +
                "\n\n只回傳 JSON，不加 markdown code block 或任何說明文字。",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const block = data.content?.[0];
  const text = block?.type === "text" ? (block.text ?? "") : "";
  const rawUsage = data.usage;
  const usage =
    rawUsage &&
    typeof rawUsage.input_tokens === "number" &&
    typeof rawUsage.output_tokens === "number"
      ? {
          input_tokens: rawUsage.input_tokens,
          output_tokens: rawUsage.output_tokens,
        }
      : null;
  return { text, usage };
}
