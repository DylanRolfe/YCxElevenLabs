"use client";

// Lead detail: draft, rehearsal results, approve and send, talk link, lead card.

import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeft,
  CheckIcon,
  ExternalIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
} from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, ErrorNote, Eyebrow, Pill } from "@/components/ui";
import { talkLink } from "@/lib/links";
import { supabase } from "@/lib/supabase";
import { STATUSES, type Lead } from "@/lib/types";
import { LeadCard } from "./LeadCard";

const POLL_MS = 3000;

const STEPS: { status: Lead["status"]; label: string; detail: string }[] = [
  { status: "found", label: "Found", detail: "Company and contact identified." },
  { status: "drafted", label: "Drafted", detail: "First email written from your brief." },
  { status: "rehearsed", label: "Rehearsed", detail: "Tested on a simulated buyer panel." },
  { status: "approved", label: "Approved", detail: "You signed off on the email." },
  { status: "sent", label: "Sent", detail: "Delivered with a talk link." },
  { status: "talked", label: "Talked", detail: "Call done, lead card ready." },
];

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

  const sendNow = () =>
    run("send", async () => {
      await postJson("/api/send", { leadId: id });
    });

  const crumbs = [
    { label: "Workspace", href: "/" },
    { label: "Leads", href: "/#leads" },
    { label: lead?.company || "Lead" },
  ];

  if (missing) {
    return (
      <AppShell crumbs={crumbs} active="leads">
        <div className="mx-auto max-w-6xl">
          <p>Lead not found.</p>
          <Link href="/" className="text-sm text-brand underline">
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }
  if (!lead) {
    return (
      <AppShell crumbs={crumbs} active="leads">
        <p className="text-sm text-muted">Loading...</p>
      </AppShell>
    );
  }

  const link = talkLink(lead.id, origin);
  const stepIndex = STATUSES.indexOf(lead.status);
  const email = lead.email_final || lead.email_draft;
  const isSent = lead.status === "sent" || lead.status === "talked";

  const primary = {
    found: { label: "Draft email", busyLabel: "Drafting...", key: "draft", onClick: draft },
    drafted: { label: "Rehearse", busyLabel: "Rehearsing...", key: "rehearse", onClick: rehearse },
    rehearsed: { label: "Approve and send", busyLabel: "Sending...", key: "send", onClick: approveAndSend },
    approved: { label: "Send now", busyLabel: "Sending...", key: "send", onClick: sendNow },
    sent: null,
    talked: null,
  }[lead.status];

  const statusNote = {
    found: "Next: draft the first email from your brief.",
    drafted:
      "Waiting for the buyer panel. It runs on Maritime when configured, or locally with python panel/panel.py.",
    rehearsed: `Nothing is sent until you click. The email goes to ${lead.contact_email || "the contact"} with the talk link.`,
    approved: "Approved, not sent yet.",
    sent: "Sent. Waiting for the prospect to open the talk link.",
    talked: "Call complete. The lead card is ready.",
  }[lead.status];

  return (
    <AppShell crumbs={crumbs} active="leads" workspace={lead.seller_name}>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> All leads
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {lead.company}
            </h1>
            <StatusBadge status={lead.status} />
          </div>
          {lead.company_summary && (
            <p className="mt-1.5 text-sm text-muted">{lead.company_summary}</p>
          )}
        </header>

        <div className="space-y-3">
          <ErrorNote message={error} />
          {note && (
            <p className="rounded-lg border border-brand-tint bg-brand-soft px-3 py-2 text-sm text-brand">
              {note}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Left column: progress, rehearsal evidence, talk link */}
          <div className="space-y-6">
            <Card title="Where this lead stands" subtitle={statusNote}>
              <ol className="space-y-1">
                {STEPS.map((s, i) => {
                  const done = i < stepIndex;
                  const current = i === stepIndex;
                  return (
                    <li key={s.status} className="flex gap-3 py-1.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                          done
                            ? "border-brand bg-brand text-white"
                            : current
                              ? "border-brand bg-brand-soft text-brand"
                              : "border-line text-faint"
                        }`}
                      >
                        {done ? <CheckIcon size={12} /> : i + 1}
                      </span>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            done || current ? "text-ink" : "text-faint"
                          }`}
                        >
                          {s.label}
                        </p>
                        <p className="text-xs text-muted">{s.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            {lead.panel_objections && lead.panel_objections.length > 0 && (
              <Card
                title="Rehearsal, not guesswork"
                subtitle="How the simulated buyer panel reacted to the draft."
                action={
                  <Pill tone="brand">
                    {lead.panel_objections.length}{" "}
                    {lead.panel_objections.length === 1 ? "persona" : "personas"}
                  </Pill>
                }
              >
                <ol className="divide-y divide-line">
                  {lead.panel_objections.map((answer, i) => (
                    <li key={i} className="flex gap-3 py-3 first:pt-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-muted">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-muted">{answer.persona}</p>
                          <Pill tone={answer.would_click === "Yes" ? "brand" : "neutral"}>
                            Would click: {answer.would_click}
                          </Pill>
                        </div>
                        <p className="mt-1 text-sm font-medium">
                          {answer.objection}
                        </p>
                        {answer.click_reason && (
                          <p className="mt-1 text-xs text-muted">
                            {answer.click_reason}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {lead.predicted_objection && (
                  <div className="mt-3 rounded-lg bg-canvas p-3">
                    <Eyebrow>Predicted objection</Eyebrow>
                    <p className="mt-1 text-sm">{lead.predicted_objection}</p>
                  </div>
                )}
              </Card>
            )}

            {!lead.panel_objections?.length && lead.predicted_objection && (
              <Card title="Predicted objection">
                <p className="text-sm">{lead.predicted_objection}</p>
              </Card>
            )}

            <Card
              title="Talk link"
              subtitle="The prospect opens this to talk to your AI rep."
              icon={<PhoneIcon />}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0 rounded-lg border border-line bg-white p-2">
                  <QRCodeSVG value={link} size={96} fgColor="#1d1d1b" />
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-0 items-start gap-1.5 text-sm break-all text-brand hover:underline"
                >
                  {link}
                  <ExternalIcon size={14} className="mt-0.5 shrink-0" />
                </a>
              </div>
            </Card>
          </div>

          {/* Right column: contact, call outcome, email, approval */}
          <div className="space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5">
              <div className="min-w-0">
                <Eyebrow>Decision-maker</Eyebrow>
                <p className="mt-1.5 text-lg font-semibold">
                  {lead.contact_name || "Unknown contact"}
                </p>
                <p className="text-xs text-muted">
                  {[lead.contact_title, lead.company].filter(Boolean).join(" at ")}
                </p>
              </div>
              {lead.contact_email && (
                <p className="flex items-center gap-2 text-sm">
                  <MailIcon className="text-muted" />
                  {lead.contact_email}
                </p>
              )}
            </section>

            {lead.status === "talked" && <LeadCard lead={lead} />}

            {email ? (
              <Card
                title={
                  lead.email_final
                    ? "Final email"
                    : "Draft email"
                }
                subtitle={
                  lead.email_final
                    ? "Rewritten to answer the predicted objection."
                    : "First draft, before rehearsal."
                }
                action={
                  isSent ? (
                    <Pill tone="neutral">Sent</Pill>
                  ) : lead.status === "rehearsed" ? (
                    <Pill tone="brand">Needs approval</Pill>
                  ) : null
                }
              >
                <dl className="grid grid-cols-[64px_1fr] gap-y-2 border-y border-line py-3 text-sm">
                  <dt className="text-muted">To</dt>
                  <dd className="min-w-0 truncate">
                    {lead.contact_name}
                    {lead.contact_email ? ` <${lead.contact_email}>` : ""}
                  </dd>
                  <dt className="text-muted">Subject</dt>
                  <dd className="font-medium">{lead.email_subject}</dd>
                </dl>
                <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {email}
                </p>
                {lead.email_final && lead.email_draft && (
                  <details className="mt-4 rounded-lg bg-canvas p-3">
                    <summary className="cursor-pointer text-xs font-medium text-muted">
                      Show the original draft
                    </summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted">
                      {lead.email_draft}
                    </p>
                  </details>
                )}
                <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
                  AI-generated · {isSent ? "Sent" : "Not sent"}
                </p>
              </Card>
            ) : (
              <Card title="Email" subtitle="No draft yet.">
                <p className="text-sm text-muted">
                  Draft the email to see it here.
                </p>
              </Card>
            )}

            {!isSent && (
              <section className="flex gap-3 rounded-xl border border-brand-tint bg-brand-soft p-4">
                <ShieldIcon size={18} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-medium">
                    Only your approval sends this email.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Review the facts and wording before approving. The send
                    step refuses any lead you have not approved.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-xs text-faint">
            Status: {lead.status} · updates live
          </p>
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-canvas"
            >
              Back to leads
            </Link>
            {primary && (
              <Button onClick={primary.onClick} disabled={busy !== null}>
                {primary.key === "send" && <CheckIcon size={15} />}
                {busy === primary.key ? primary.busyLabel : primary.label}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
