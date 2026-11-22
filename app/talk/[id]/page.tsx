"use client";

// Prospect talk page. Opened from the email link, usually on a phone.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";
import { SimulateCall } from "./SimulateCall";
import { VoiceCall } from "./VoiceCall";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

export default function TalkPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError("This link is no longer active.");
        else setLead(data as Lead);
      });
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-sm text-muted">
        {error}
      </main>
    );
  }
  if (!lead) {
    return <main className="mx-auto max-w-md p-6 text-sm">Loading...</main>;
  }

  const seller = lead.seller_name || "the team";
  const firstName = (lead.contact_name || "").split(" ")[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-5">
      <header className="pt-4">
        <p className="text-sm text-muted">AI assistant for</p>
        <h1 className="text-3xl font-semibold tracking-tight">{seller}</h1>
        <p className="mt-2 text-ink">
          {firstName ? `Hi ${firstName}. ` : ""}Ask anything about how {seller}{" "}
          could help {lead.company || "your business"}. It takes about a minute.
        </p>
      </header>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        You will be talking to an <strong>AI assistant</strong>, not a person.
        The conversation is <strong>recorded</strong> and a summary is shared
        with {seller}.
      </p>

      {AGENT_ID ? (
        <VoiceCall agentId={AGENT_ID} lead={lead} />
      ) : (
        <SimulateCall lead={lead} />
      )}
    </main>
  );
}
