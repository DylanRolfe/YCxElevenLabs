// DeepSeek writes the outreach email (OpenAI-compatible API, JSON mode).
// Used when DEEPSEEK_API_KEY is set; takes priority over Claude.

import { z } from "zod";
import type { Lead } from "@/lib/types";
import { SYSTEM, userPrompt, type DraftedEmail } from "./claude";

const EmailSchema = z.object({ subject: z.string(), body: z.string() });

export async function draftWithDeepSeek(lead: Lead): Promise<DraftedEmail> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      response_format: { type: "json_object" },
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `${SYSTEM}\n\nReply with only a JSON object: {"subject": string, "body": string}.`,
        },
        { role: "user", content: userPrompt(lead) },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  const parsed = EmailSchema.safeParse(JSON.parse(text || "{}"));
  if (!parsed.success) {
    throw new Error(`DeepSeek returned an unexpected shape: ${text.slice(0, 200)}`);
  }
  return parsed.data;
}
