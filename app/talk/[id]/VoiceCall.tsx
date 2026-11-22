"use client";

// Live ElevenLabs agent session with an on-screen transcript.
// Matches @elevenlabs/react 1.23 (docs checked 2026-11-22): hooks must sit
// under <ConversationProvider>; a public agent starts with just `agentId`;
// dynamic variables are passed to startSession.

import {
  ConversationProvider,
  useConversation,
  type MessagePayload,
} from "@elevenlabs/react";
import { useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import type { Lead } from "@/lib/types";

type Line = { role: string; message: string };

function Call({ agentId, lead }: { agentId: string; lead: Lead }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const conversation = useConversation({
    onMessage: (m: MessagePayload) =>
      setLines((prev) => [...prev, { role: m.role, message: m.message }]),
    onError: (message: string) => setError(message),
    onDisconnect: () => setEnded(true),
  });

  const { status, isSpeaking } = conversation;

  async function start() {
    setError(null);
    setEnded(false);
    setLines([]);
    try {
      // Ask for the microphone first so the browser prompt has context.
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access is needed to talk. Please allow it and try again.");
      return;
    }
    conversation.startSession({
      agentId,
      // Must match the variables in docs/elevenlabs-agent.md.
      dynamicVariables: {
        lead_id: lead.id,
        seller_name: lead.seller_name ?? "",
        seller_pitch: lead.seller_pitch ?? "",
        prospect_name: lead.contact_name ?? "",
        prospect_company: lead.company ?? "",
        company_summary: lead.company_summary ?? "",
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ErrorNote message={error} />

      {status === "disconnected" && (
        <Button onClick={start} className="py-3 text-base">
          {ended ? "Start again" : "Start conversation"}
        </Button>
      )}
      {status === "connecting" && (
        <Button disabled className="py-3 text-base">
          Connecting...
        </Button>
      )}
      {status === "connected" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {isSpeaking ? "Assistant is speaking..." : "Listening..."}
          </p>
          <Button variant="secondary" onClick={() => conversation.endSession()}>
            End call
          </Button>
        </div>
      )}

      {ended && status === "disconnected" && (
        <p className="rounded-lg border border-brand-tint bg-brand-soft p-3 text-sm text-brand">
          Thanks for talking. A summary is on its way to{" "}
          {lead.seller_name || "the team"}.
        </p>
      )}

      {lines.length > 0 && (
        <ol className="space-y-2 rounded-xl border border-line bg-white p-3">
          {lines.map((line, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium">
                {line.role === "user" ? "You" : "Assistant"}:
              </span>{" "}
              {line.message}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function VoiceCall(props: { agentId: string; lead: Lead }) {
  return (
    <ConversationProvider>
      <Call {...props} />
    </ConversationProvider>
  );
}
