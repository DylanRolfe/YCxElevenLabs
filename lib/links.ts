// Emails are drafted with this placeholder; /api/send swaps in the real link.
// Square brackets on purpose: curly braces collide with EDSL (Jinja) and
// ElevenLabs dynamic-variable templating.
export const TALK_LINK_PLACEHOLDER = "[TALK_LINK]";

export function appUrl(origin?: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export function talkLink(leadId: string, origin?: string): string {
  return `${appUrl(origin)}/talk/${leadId}`;
}
