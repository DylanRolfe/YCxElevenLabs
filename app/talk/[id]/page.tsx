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
    return <main className="mx-auto max-w-md p-6 text-center text-sm text-muted">
        Loading...
      </main>;
  }

  const seller = lead.seller_name || "the team";
  const firstName = (lead.contact_name || "").split(" ")[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8">
      <header className="pt-6 text-center">
        <p className="text-sm text-muted">AI assistant for</p>
        <h1 className="mt-1 text-4xl leading-[1.05] font-medium tracking-[-0.035em] text-balance">
          {seller}
        </h1>
        <p className="mt-4 text-muted">
          {firstName ? `Hi ${firstName}. ` : ""}Ask anything about how {seller}{" "}
          could help {lead.company || "your business"}. It takes about a minute.
        </p>
      </header>

      <p className="rounded-xl border border-signal/25 bg-signal/[0.07] p-3 text-sm text-ink">
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
