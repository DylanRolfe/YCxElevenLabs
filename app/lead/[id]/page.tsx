"use client";

// Lead detail: draft, rehearsal results, approve and send, talk link, lead card.

import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, ErrorNote } from "@/components/ui";
import { talkLink } from "@/lib/links";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";
import { LeadCard } from "./LeadCard";

const POLL_MS = 3000;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${url} failed (${res.status})`);
  return data;
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) setError(`Could not load lead: ${error.message}`);
    else if (!data) setMissing(true);
    else setLead(data as Lead);
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function run(label: string, action: () => Promise<void>) {
    setError(null);
    setNote(null);
    setBusy(label);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const draft = () =>
    run("draft", async () => {
      await postJson("/api/draft", { leadId: id });
    });

  const rehearse = () =>
    run("rehearse", async () => {
      const result = await postJson("/api/rehearse", { leadId: id });
      setNote(result.message || null);
    });

  // The only path to sending: a human clicks this button.
  const approveAndSend = () =>
    run("send", async () => {
      const { error } = await supabase
        .from("leads")
        .update({ status: "approved" })
        .eq("id", id)
        .eq("status", "rehearsed");
      if (error) throw new Error(error.message);
      await postJson("/api/send", { leadId: id });
    });

  if (missing) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>Lead not found.</p>
        <Link href="/" className="text-sm underline">
          Back to dashboard
        </Link>
      </main>
    );
  }
  if (!lead) {
    return <main className="mx-auto max-w-3xl p-6 text-sm">Loading...</main>;
  }

  const link = talkLink(lead.id, origin);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <Link href="/" className="text-sm text-slate-600 underline">
        Back to dashboard
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{lead.company}</h1>
          <p className="text-sm text-slate-600">
            {lead.contact_name}
            {lead.contact_title ? `, ${lead.contact_title}` : ""}
            {lead.contact_email ? ` · ${lead.contact_email}` : ""}
          </p>
          {lead.company_summary && (
            <p className="mt-1 text-sm text-slate-500">
              {lead.company_summary}
            </p>
          )}
        </div>
        <StatusBadge status={lead.status} />
      </header>

      <ErrorNote message={error} />
      {note && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {note}
        </p>
      )}

      {lead.status === "talked" && <LeadCard lead={lead} />}

      {lead.status === "found" && (
        <Card title="Next: draft the email">
          <Button onClick={draft} disabled={busy !== null}>
            {busy === "draft" ? "Drafting..." : "Draft email"}
          </Button>
        </Card>
      )}

      {lead.status === "drafted" && (
        <Card title="Next: rehearse on the buyer panel">
          <p className="mb-3 text-sm text-slate-600">
            Waiting for the panel. It runs on Maritime when configured, or
            locally with <code>python panel/panel.py</code>.
          </p>
          <Button
            variant="secondary"
            onClick={rehearse}
            disabled={busy !== null}
          >
            {busy === "rehearse" ? "Rehearsing..." : "Rehearse"}
          </Button>
        </Card>
      )}

      {lead.status === "rehearsed" && (
        <Card title="Next: your approval">
          <p className="mb-3 text-sm text-slate-600">
            Nothing is sent until you click. The final email below goes to{" "}
            {lead.contact_email || "the contact"} with the talk link.
          </p>
          <Button onClick={approveAndSend} disabled={busy !== null}>
            {busy === "send" ? "Sending..." : "Approve and send"}
          </Button>
        </Card>
      )}

      {lead.status === "approved" && (
        <Card title="Approved, not sent yet">
          <Button
            onClick={() =>
              run("send", async () => {
                await postJson("/api/send", { leadId: id });
              })
            }
            disabled={busy !== null}
          >
            {busy === "send" ? "Sending..." : "Send now"}
          </Button>
        </Card>
      )}

      {lead.email_draft && (
        <Card title="Draft email">
          <p className="text-sm font-medium">{lead.email_subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {lead.email_draft}
          </p>
        </Card>
      )}

      {lead.panel_objections && lead.panel_objections.length > 0 && (
        <Card title="Buyer panel">
          <ul className="space-y-3">
            {lead.panel_objections.map((answer, i) => (
              <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium">{answer.persona}</p>
                <p className="mt-1 text-slate-700">{answer.objection}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Would click the link: {answer.would_click}
                  {answer.click_reason ? ` (${answer.click_reason})` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lead.predicted_objection && (
        <Card title="Predicted objection">
          <p className="text-sm">{lead.predicted_objection}</p>
        </Card>
      )}

      {lead.email_final && (
        <Card title="Final email (rewritten to answer the objection)">
          <p className="text-sm font-medium">{lead.email_subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {lead.email_final}
          </p>
        </Card>
      )}

      <Card title="Talk link">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
            <QRCodeSVG value={link} size={128} />
          </div>
          <div className="min-w-0">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-blue-700 underline"
            >
              {link}
            </a>
            <p className="mt-1 text-xs text-slate-500">
              The prospect opens this to talk to your AI rep.
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}
