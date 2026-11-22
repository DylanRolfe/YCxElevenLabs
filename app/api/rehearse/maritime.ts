// Triggers the rehearsal panel for one lead.
//
// With MARITIME_API_KEY + MARITIME_AGENT_ID set, calls the hosted agent
// (see maritime-agent/ and docs/maritime-deploy.md). Verified against
// https://maritime.sh/docs/api on 2026-11-22:
//   POST https://api.maritime.sh/api/agents/{agent_id}/chat
//   Authorization: Bearer mk_...
//   body { "message": "..." }  ->  { "response": "..." }
//
// Without them it does nothing: the lead stays `drafted` and the local
// `python panel/panel.py` loop picks it up.

export type RehearsalResult = {
  mode: "maritime" | "local";
  message: string;
  response?: string;
};

export function maritimeConfigured(): boolean {
  return Boolean(process.env.MARITIME_API_KEY && process.env.MARITIME_AGENT_ID);
}

export async function triggerRehearsal(leadId: string): Promise<RehearsalResult> {
  if (!maritimeConfigured()) {
    return {
      mode: "local",
      message:
        "Maritime is not configured. The lead stays drafted; run `python panel/panel.py` to rehearse it locally.",
    };
  }

  const res = await fetch(
    `https://api.maritime.sh/api/agents/${process.env.MARITIME_AGENT_ID}/chat`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MARITIME_API_KEY}`,
        "Content-Type": "application/json",
      },
      // The agent accepts a bare lead id or JSON with lead_id.
      body: JSON.stringify({ message: JSON.stringify({ lead_id: leadId }) }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Maritime chat failed (${res.status}): ${text.slice(0, 300)}`);
  }

  let response = text;
  try {
    response = JSON.parse(text).response ?? text;
  } catch {}

  // The agent reports its own failures as a 200 with "error: ...".
  if (typeof response === "string" && response.startsWith("error:")) {
    throw new Error(`Maritime agent ${response}`);
  }

  return {
    mode: "maritime",
    response,
    message:
      response === "accepted"
        ? "Rehearsal is running on Maritime. This page updates when it finishes."
        : `Rehearsed on Maritime. Predicted objection: ${response}`,
  };
}
