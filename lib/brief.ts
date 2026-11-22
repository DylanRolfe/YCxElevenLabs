// The company brief is a document the owner uploads so the voice agent can
// answer questions on a call. It rides inside `seller_pitch`, after the short
// pitch, because that column is what the email draft, the buyer panel and the
// agent's {{seller_pitch}} variable already read. No schema or agent change.

export const BRIEF_MARKER = "\n\nCompany brief (uploaded document):\n";

// Keeps the agent's prompt a sensible size. About 3,000 words.
export const BRIEF_MAX_CHARS = 20000;
export const BRIEF_MAX_BYTES = 10 * 1024 * 1024;

export function pitchWithBrief(pitch: string, brief: string): string {
  const text = brief.trim();
  return text ? `${pitch}${BRIEF_MARKER}${text}` : pitch;
}

// The owner's own short pitch, without the uploaded brief.
export function shortPitch(full: string): string {
  const at = full.indexOf(BRIEF_MARKER);
  return at === -1 ? full : full.slice(0, at);
}
