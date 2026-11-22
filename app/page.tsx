"use client";

// Owner dashboard: seller brief, find leads, manual add, live leads list.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DotWave } from "@/components/DotWave";
import {
  ArrowRight,
  CheckIcon,
  ChevronRight,
  DocIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  UploadIcon,
} from "@/components/icons";
import { NEXT_STEP, StatusBadge } from "@/components/StatusBadge";
import { Button, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { pitchWithBrief } from "@/lib/brief";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Lead, LeadStatus } from "@/lib/types";

const SELLER_KEY = "rehearsal-rep-seller";
const POLL_MS = 3000;

const EMPTY_LEAD = {
  company: "",
  contact_name: "",
  contact_title: "",
  contact_email: "",
  company_summary: "",
};

const FILTERS: { key: string; label: string; match: LeadStatus[] | null }[] = [
  { key: "all", label: "All", match: null },
  { key: "review", label: "Needs approval", match: ["rehearsed", "approved"] },
  { key: "progress", label: "In progress", match: ["found", "drafted"] },
  { key: "sent", label: "Sent", match: ["sent"] },
  { key: "talked", label: "Talked", match: ["talked"] },
];

type Brief = {
  fileName: string;
  pages: number | null;
  truncated: boolean;
  text: string;
};

function count(leads: Lead[], statuses: LeadStatus[]) {
  return leads.filter((l) => statuses.includes(l.status)).length;
}

export default function Dashboard() {
  const [sellerName, setSellerName] = useState("");
  const [sellerPitch, setSellerPitch] = useState("");
  const [targetType, setTargetType] = useState("");
  const [form, setForm] = useState(EMPTY_LEAD);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [finding, setFinding] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seller brief lives in localStorage and is copied onto each new lead.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SELLER_KEY) || "{}");
      setSellerName(saved.name || "");
      setSellerPitch(saved.pitch || "");
      setBrief(saved.brief?.text ? saved.brief : null);
    } catch {}
  }, []);

  function saveSeller(name: string, pitch: string, doc: Brief | null = brief) {
    setSellerName(name);
    setSellerPitch(pitch);
    setBrief(doc);
    try {
      localStorage.setItem(
        SELLER_KEY,
        JSON.stringify({ name, pitch, brief: doc }),
      );
    } catch {}
  }

  // Reads the text out of the uploaded file; it then travels with the pitch.
  async function uploadBrief(file: File) {
    setBriefError(null);
    setBriefBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/brief", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not read that file.");
      saveSeller(sellerName, sellerPitch, {
        fileName: body.fileName,
        pages: body.pages,
        truncated: body.truncated,
        text: body.text,
      });
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : String(e));
    } finally {
      setBriefBusy(false);
    }
  }

  // What gets copied onto a new lead: the pitch, then the brief if there is one.
  const leadPitch = pitchWithBrief(sellerPitch, brief?.text ?? "");

  const loadLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(`Could not load leads: ${error.message}`);
    } else {
      setLeads((data as Lead[]) ?? []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    loadLeads();
    const timer = setInterval(loadLeads, POLL_MS);
    return () => clearInterval(timer);
  }, [loadLeads]);

  const sellerReady = sellerName.trim() !== "" && sellerPitch.trim() !== "";

  async function findLeads() {
    setError(null);
    setFinding(true);
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          sellerName,
          sellerPitch: leadPitch,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Find failed");
      await loadLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinding(false);
    }
  }

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    // Server-side insert: the live DB's anon key can read leads, not add them.
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sellerName, sellerPitch: leadPitch }),
    }).catch((e: unknown) => e);
    setAdding(false);
    if (!(res instanceof Response) || !res.ok) {
      const body =
        res instanceof Response ? await res.json().catch(() => ({})) : {};
      const message =
        body.error ?? (res instanceof Error ? res.message : "request failed");
      setError(`Could not add lead: ${message}`);
      return;
    }
    setForm(EMPTY_LEAD);
    setShowAdd(false);
    loadLeads();
  }

  const review = count(leads, ["rehearsed", "approved"]);
  const sent = count(leads, ["sent", "talked"]);
  const talked = count(leads, ["talked"]);
  const inProgress = count(leads, ["found", "drafted"]);
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const visible = active.match
    ? leads.filter((l) => active.match!.includes(l.status))
    : leads;

  const headline =
    leads.length === 0
      ? "Tell me about your business and who to reach."
      : `I've found ${leads.length} ${leads.length === 1 ? "company" : "companies"}${
          review > 0
            ? ` and ${review} ${review === 1 ? "draft is" : "drafts are"} ready for you.`
            : "."
        }`;
  const subline =
    leads.length === 0
      ? "I'll find companies, draft an email, rehearse it on a simulated buyer, and wait for your approval."
      : `${inProgress} in progress, ${review} waiting on your approval, ${sent} emailed, ${talked} ${talked === 1 ? "call" : "calls"} completed.`;

  return (
    <AppShell
      crumbs={[{ label: "Workspace" }, { label: "Your AI sales rep" }]}
      active="overview"
      workspace={sellerName}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {!supabaseConfigured && (
          <p className="rounded-lg border border-signal/25 bg-signal/[0.07] px-3 py-2 text-sm text-ink">
            Supabase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code>, set the Supabase URL and anon key, then
            restart <code>npm run dev</code>.
          </p>
        )}
        <ErrorNote message={error} />

        {/* Hero: what the rep has done, over a dot-matrix voice waveform. */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-black">
          <DotWave className="pointer-events-none absolute top-0 right-0 h-[calc(100%-7rem)] hidden w-[68%] text-ink sm:block" />
          <div className="relative px-6 pt-10 pb-12 sm:px-10 sm:pt-14 sm:pb-16">
            <p className="flex items-center gap-2 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Your sales coworker, updating live
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl leading-[1.04] font-medium tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              {subline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                className="px-5 py-2.5"
                onClick={() => {
                  targetRef.current?.scrollIntoView({ block: "center" });
                  targetRef.current?.focus();
                }}
              >
                Find leads <ArrowRight size={15} />
              </Button>
              <Button
                variant="secondary"
                className="px-5 py-2.5"
                onClick={() => setShowAdd((s) => !s)}
                aria-expanded={showAdd}
              >
                <PlusIcon size={15} /> {showAdd ? "Close" : "Add a lead"}
              </Button>
            </div>
          </div>
          <dl className="relative grid grid-cols-2 gap-px border-t border-line bg-line lg:grid-cols-4">
            <Stat label="Companies found" value={leads.length} note="In your pipeline" />
            <Stat label="Ready for approval" value={review} note="Rehearsed, waiting on you" />
            <Stat label="Emails sent" value={sent} note="Each with a talk link" />
            <Stat label="Calls completed" value={talked} note="Lead cards ready" />
          </dl>
        </section>

        {showAdd && (
          <Card
            title="Add a lead by hand"
            subtitle="It starts as Found and goes through the same rehearsal."
          >
            <form onSubmit={addLead} className="grid gap-4 sm:grid-cols-2">
              <Field label="Company">
                <input
                  className={inputClass}
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </Field>
              <Field label="Contact name">
                <input
                  className={inputClass}
                  required
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm({ ...form, contact_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Title">
                <input
                  className={inputClass}
                  value={form.contact_title}
                  onChange={(e) =>
                    setForm({ ...form, contact_title: e.target.value })
                  }
                  placeholder="Owner"
                />
              </Field>
              <Field label="Email">
                <input
                  className={inputClass}
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="One line about the company">
                  <input
                    className={inputClass}
                    value={form.company_summary}
                    onChange={(e) =>
                      setForm({ ...form, company_summary: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" disabled={adding || !sellerReady}>
                  {adding ? "Adding..." : "Add lead"}
                </Button>
                {!sellerReady && (
                  <p className="text-xs text-muted">
                    Fill in your business first.
                  </p>
                )}
              </div>
            </form>
          </Card>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section
            id="leads"
            className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-panel"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="px-1 text-[15px] font-medium">Companies in view</h2>
              <div className="flex max-w-full gap-0.5 overflow-x-auto rounded-full [scrollbar-width:none] border border-line bg-canvas p-1 text-xs">
                {FILTERS.map((f) => {
                  const n = f.match ? count(leads, f.match) : leads.length;
                  const on = f.key === filter;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      aria-pressed={on}
                      className={`rounded-full px-3 py-1 font-medium whitespace-nowrap transition-colors ${
                        on ? "bg-raised text-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      {f.label}{" "}
                      <span className={on ? "text-muted" : "text-faint"}>
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                {!loaded
                  ? "Loading..."
                  : leads.length === 0
                    ? "No leads yet. Find some or add one by hand."
                    : "Nothing in this view."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-faint">
                      <th className="px-5 py-2.5 font-medium">Company</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Contact</th>
                      <th className="px-3 py-2.5 font-medium">Next step</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((lead) => {
                      const next = NEXT_STEP[lead.status];
                      const highlight = lead.status === "rehearsed";
                      const href = `/lead/${lead.id}`;
                      return (
                        <tr
                          key={lead.id}
                          className={`group transition-colors hover:bg-raised ${
                            highlight ? "bg-signal/[0.05]" : ""
                          }`}
                        >
                          <td className="px-5 py-3">
                            <Link href={href} className="block">
                              <p className="font-medium">
                                {lead.company || "Unknown company"}
                              </p>
                              {lead.company_summary && (
                                <p className="max-w-[260px] truncate text-xs text-muted">
                                  {lead.company_summary}
                                </p>
                              )}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={lead.status} />
                          </td>
                          <td className="px-3 py-3">
                            <p className="truncate">{lead.contact_name}</p>
                            {lead.contact_title && (
                              <p className="truncate text-xs text-muted">
                                {lead.contact_title}
                              </p>
                            )}
                          </td>
                          <td
                            className={`px-3 py-3 whitespace-nowrap ${
                              next.yours ? "font-medium text-ink" : "text-muted"
                            }`}
                          >
                            {next.label}
                          </td>
                          <td className="pr-4">
                            <Link
                              href={href}
                              aria-label={`Open ${lead.company}`}
                              className="flex justify-end text-faint group-hover:text-ink"
                            >
                              <ChevronRight />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="space-y-6">
            <Card
              title="Your business"
              subtitle="Your brief is the starting point for every email."
              icon={<DocIcon />}
            >
              <div className="space-y-4">
                <Field label="Business name">
                  <input
                    className={inputClass}
                    value={sellerName}
                    onChange={(e) => saveSeller(e.target.value, sellerPitch)}
                    placeholder="Northside Bookkeeping"
                  />
                </Field>
                <Field label="Short pitch">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={sellerPitch}
                    onChange={(e) => saveSeller(sellerName, e.target.value)}
                    placeholder="We do monthly bookkeeping for cafes and restaurants, flat fee, books closed by the 5th."
                  />
                </Field>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted">
                    Company brief for calls
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) uploadBrief(file);
                    }}
                  />
                  {brief ? (
                    <div className="rounded-lg border border-line bg-raised p-3">
                      <p className="flex items-center gap-2 text-sm">
                        <DocIcon className="shrink-0 text-muted" />
                        <span className="truncate">{brief.fileName}</span>
                      </p>
                      <p className="mt-1 text-xs text-faint">
                        {brief.pages
                          ? `${brief.pages} ${brief.pages === 1 ? "page" : "pages"}, `
                          : ""}
                        {brief.text.length.toLocaleString()} characters
                        {brief.truncated ? " (start of the file only)" : ""}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-1 text-xs"
                          disabled={briefBusy}
                          onClick={() => fileRef.current?.click()}
                        >
                          {briefBusy ? "Reading..." : "Replace"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          disabled={briefBusy}
                          onClick={() => {
                            setBriefError(null);
                            saveSeller(sellerName, sellerPitch, null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={briefBusy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <UploadIcon size={15} />
                      {briefBusy ? "Reading..." : "Upload brief (PDF)"}
                    </Button>
                  )}
                  {briefError && (
                    <p role="alert" className="mt-1.5 text-xs text-red-300">
                      {briefError}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs leading-relaxed text-faint">
                    {brief
                      ? "Your AI rep answers call questions from this. It is added to leads you create from now on."
                      : "Prices, services, hours, FAQs: your AI rep answers call questions from it. PDF or text, up to 10 MB."}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              title="Find leads"
              subtitle="Describe who you want to reach."
              icon={<SparkleIcon />}
            >
              <div className="space-y-3">
                <input
                  ref={targetRef}
                  className={inputClass}
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  placeholder="Independent coffee shops in Toronto"
                  aria-label="Who do you want to reach?"
                />
                <Button
                  className="w-full"
                  onClick={findLeads}
                  disabled={finding || !sellerReady || targetType.trim() === ""}
                >
                  {finding ? "Finding..." : "Find leads"}
                </Button>
                {!sellerReady && (
                  <p className="text-xs text-muted">
                    Fill in your business name and pitch first.
                  </p>
                )}
              </div>
            </Card>

            <Card title="Values & boundaries" icon={<ShieldIcon />}>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Every email is rehearsed on a simulated buyer panel first.",
                  "Nothing is sent until you approve it.",
                  "Prospects are told they are talking to an AI.",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-muted" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-faint">
          <span>Leads update live</span>
          <span>Find → Draft → Rehearse → Approve → Talk → Report</span>
        </footer>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="bg-black px-6 py-5 sm:px-10 lg:px-6 lg:first:pl-10">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-2">
        <span className="block text-3xl font-medium tracking-[-0.03em] tabular-nums">
          {value}
        </span>
        <span className="mt-1 block text-xs text-faint">{note}</span>
      </dd>
    </div>
  );
}
