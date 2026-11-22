"use client";

// Mock mode: shown when NEXT_PUBLIC_ELEVENLABS_AGENT_ID is missing.
// Posts a fake payload shaped like the real ElevenLabs post-call webhook.

import { useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import type { Lead } from "@/lib/types";

const TRANSCRIPT = [
  { role: "agent", message: "Hi, I am an AI assistant and this call is recorded. What would you like to know?" },
  { role: "user", message: "Honestly, I do not have time to switch to something new right now. What does it actually take to get started?" },
  { role: "agent", message: "Fair. Setup is short and I can have the owner walk you through it. What is the biggest headache for you today?" },
  { role: "user", message: "Month-end. I lose two evenings to it. Fine, I would take a 15 minute call next week." },
];

function fakePayload(lead: Lead) {
  const collected = (id: string, value: string) => ({
    data_collection_id: id,
    value,
    rationale: "Simulated call.",
  });
  return {
    type: "post_call_transcription",
    event_timestamp: Math.floor(Date.now() / 1000),
    data: {
      agent_id: "simulated",
      conversation_id: `sim_${Date.now()}`,
      status: "done",
      transcript: TRANSCRIPT,
      analysis: {
        call_successful: "success",
        transcript_summary:
          "The prospect loses two evenings a month to month-end admin. They worried about the time needed to switch, then agreed to a short call next week.",
        data_collection_results: {
          need: collected("need", "Stop losing two evenings every month to month-end admin."),
          main_objection: collected("main_objection", "No time to switch to something new right now."),
          next_step: collected("next_step", "15 minute call with the owner next week."),
          interest_level: collected("interest_level", "medium"),
        },
      },
      conversation_initiation_client_data: {
        dynamic_variables: {
          lead_id: lead.id,
          seller_name: lead.seller_name ?? "",
          prospect_name: lead.contact_name ?? "",
        },
      },
    },
  };
}

export function SimulateCall({ lead }: { lead: Lead }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function simulate() {
    setError(null);
    setState("running");
    try {
      const res = await fetch("/api/postcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fakePayload(lead)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `postcall failed (${res.status})`);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">
        Mock mode: no ElevenLabs agent is configured, so this simulates a call.
      </p>
      <ErrorNote message={error} />
      <Button
        onClick={simulate}
        disabled={state === "running"}
        className="py-3 text-base"
      >
        {state === "running" ? "Simulating..." : "Simulate call"}
      </Button>

      {state === "done" && (
        <>
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Simulated call saved. The lead card is now on the dashboard.
          </p>
          <ol className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            {TRANSCRIPT.map((line, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">
                  {line.role === "user" ? "You" : "Assistant"}:
                </span>{" "}
                {line.message}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
