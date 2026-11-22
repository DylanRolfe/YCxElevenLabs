// POST /api/postcall  -  ElevenLabs post-call webhook.
//
// Payload paths (https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks,
// checked 2026-11-22):
//   type                                              "post_call_transcription"
//   data.conversation_initiation_client_data.dynamic_variables.lead_id
//   data.analysis.data_collection_results.<id>.value
//   data.analysis.transcript_summary
// Signature: `ElevenLabs-Signature` header, verified with the SDK's
// `webhooks.constructEvent(rawBody, signature, secret)`.
//
// If ELEVENLABS_WEBHOOK_SECRET is unset the signature check is skipped
// (mock mode, used by the Simulate call button).

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";
import { updateLead } from "@/lib/supabase-server";

type Json = Record<string, unknown>;

// Entries look like { data_collection_id, value, rationale }; tolerate a bare value.
function collected(results: Json, key: string): string | null {
  const entry = results[key];
  const value =
    entry && typeof entry === "object" ? (entry as Json).value : entry;
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  let event: Json;
  try {
    if (secret) {
      const signature = req.headers.get("elevenlabs-signature") ?? "";
      // The key is only needed to construct the client; verification is local.
      const elevenlabs = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY ?? "unused",
      });
      event = await elevenlabs.webhooks.constructEvent(rawBody, signature, secret);
    } else {
      event = JSON.parse(rawBody);
    }
  } catch (e) {
    console.error("[postcall] rejected:", e);
    return NextResponse.json({ error: "Invalid signature or body" }, { status: 401 });
  }

  try {
    // Audio and call-failure events also arrive here; acknowledge and ignore.
    if (event.type !== "post_call_transcription") {
      return NextResponse.json({ received: true, ignored: event.type ?? null });
    }

    const data = (event.data ?? {}) as Json;
    const init = (data.conversation_initiation_client_data ?? {}) as Json;
    const vars = (init.dynamic_variables ?? {}) as Json;
    const leadId = typeof vars.lead_id === "string" ? vars.lead_id : null;
    if (!leadId) {
      console.warn("[postcall] no lead_id dynamic variable; ignoring");
      return NextResponse.json({ received: true, ignored: "no lead_id" });
    }

    const analysis = (data.analysis ?? {}) as Json;
    const results = (analysis.data_collection_results ?? {}) as Json;

    await updateLead(leadId, {
      call_need: collected(results, "need"),
      call_objection: collected(results, "main_objection"),
      call_next_step: collected(results, "next_step"),
      call_interest: collected(results, "interest_level"),
      call_summary:
        typeof analysis.transcript_summary === "string"
          ? analysis.transcript_summary
          : null,
      status: "talked",
    });

    return NextResponse.json({ received: true, leadId });
  } catch (e) {
    console.error("[postcall]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
