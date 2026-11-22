// Claude writes one outreach email per lead.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { TALK_LINK_PLACEHOLDER } from "@/lib/links";
import type { Lead } from "@/lib/types";

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type DraftedEmail = z.infer<typeof EmailSchema>;

const SYSTEM = `You write cold outreach emails for a solo business owner.

Rules:
- Under 120 words in the body. Plain text, no markdown, no emojis.
- Sound like the owner wrote it by hand: specific to this prospect, no hype.
- One clear ask: invite them to talk to the owner's AI rep by opening a link.
  Write the link as the literal placeholder ${TALK_LINK_PLACEHOLDER} on its own line.
  It is replaced with the real URL when the email is sent.
- Say plainly that the link opens a short conversation with an AI assistant.
- Only use facts from the seller pitch and the prospect details. Never invent
  prices, customers, numbers or guarantees.
- Start with a greeting using the contact's first name. Do not add a signature;
  the sender name is appended automatically.`;

export async function draftWithClaude(lead: Lead): Promise<DraftedEmail> {
  const client = new Anthropic();

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // On a policy decline the API retries on the model's default fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: {
      effort: "low",
      format: zodOutputFormat(EmailSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          `Seller: ${lead.seller_name ?? "Unknown"}`,
          `Seller pitch: ${lead.seller_pitch ?? "Not provided"}`,
          "",
          `Prospect company: ${lead.company ?? "Unknown"}`,
          `Contact: ${lead.contact_name ?? "Unknown"} (${lead.contact_title ?? "role unknown"})`,
          `About the company: ${lead.company_summary ?? "No details"}`,
          "",
          "Write the email subject and body.",
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(
      `Claude did not return an email (stop_reason: ${response.stop_reason}).`,
    );
  }
  return response.parsed_output;
}

// Mock mode: used when ANTHROPIC_API_KEY is missing.
export function cannedEmail(lead: Lead): DraftedEmail {
  const first = (lead.contact_name ?? "there").split(" ")[0];
  const seller = lead.seller_name || "our team";
  const pitch = lead.seller_pitch || "We help small businesses save time.";
  return {
    subject: `Quick idea for ${lead.company ?? "your business"}`,
    body: [
      `Hi ${first},`,
      "",
      `I run ${seller}. ${pitch}`,
      "",
      `I think this could be useful for ${lead.company ?? "you"}. Rather than trade emails, you can ask my AI assistant anything about how it works. It is a short voice conversation, about a minute:`,
      "",
      TALK_LINK_PLACEHOLDER,
      "",
      "If it is not a fit, no worries at all.",
    ].join("\n"),
  };
}
