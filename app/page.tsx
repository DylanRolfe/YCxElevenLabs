"use client";

// Owner dashboard: seller brief, find leads, manual add, live leads list.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  CheckIcon,
  ChevronRight,
  DocIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
} from "@/components/icons";
import { NEXT_STEP, StatusBadge } from "@/components/StatusBadge";
import { Button, Card, ErrorNote, Field, inputClass } from "@/components/ui";
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
  const targetRef = useRef<HTMLInputElement>(null);

  // Seller brief lives in localStorage and is copied onto each new lead.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SELLER_KEY) || "{}");
      setSellerName(saved.name || "");
      setSellerPitch(saved.pitch || "");
    } catch {}
  }, []);

  function saveSeller(name: string, pitch: string) {
    setSellerName(name);
    setSellerPitch(pitch);
    try {
      localStorage.setItem(SELLER_KEY, JSON.stringify({ name, pitch }));
    } catch {}
  }

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
        body: JSON.stringify({ targetType, sellerName, sellerPitch }),
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
    const { error } = await supabase.from("leads").insert({
      ...form,
      status: "found",
      seller_name: sellerName,
      seller_pitch: sellerPitch,
    });
    setAdding(false);
    if (error) {
      setError(`Could not add lead: ${error.message}`);
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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Your sales coworker
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              It rehearses on a simulated buyer before it emails the real one.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAdd((s) => !s)}
              aria-expanded={showAdd}
            >
              {showAdd ? "Close" : "Add a lead"}
            </Button>
            <Button
              onClick={() => {
                targetRef.current?.scrollIntoView({ block: "center" });
                targetRef.current?.focus();
              }}
            >
              <PlusIcon size={15} /> Find leads
            </Button>
          </div>
        </header>

        {!supabaseConfigured && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Supabase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code>, set the Supabase URL and anon key, then
            restart <code>npm run dev</code>.
          </p>
        )}
        <ErrorNote message={error} />

        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-tint bg-brand-soft px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-tint bg-white text-brand">
            <SparkleIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium tracking-tight">{headline}</p>
            <p className="mt-0.5 text-sm text-muted">{subline}</p>
          </div>
          <p className="hidden text-[10px] font-semibold tracking-wider text-muted uppercase sm:block">
            Live · updates every 3s
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Companies found" value={leads.length} note="In your pipeline" />
          <Stat label="Ready for approval" value={review} note="Rehearsed, waiting on you" />
          <Stat label="Emails sent" value={sent} note="Each with a talk link" />
          <Stat label="Calls completed" value={talked} note="Lead cards ready" />
        </div>

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
          <Card
            id="leads"
            className="scroll-mt-6 !p-0"
            title={<span className="block px-5 pt-5">Companies in view</span>}
          >
            <div className="flex gap-5 overflow-x-auto overflow-y-hidden border-b border-line px-5 text-sm">
              {FILTERS.map((f) => {
                const n = f.match ? count(leads, f.match) : leads.length;
                const on = f.key === filter;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`-mb-px border-b-2 pb-2.5 whitespace-nowrap transition ${
                      on
                        ? "border-brand font-medium text-ink"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {f.label} {n}
                  </button>
                );
              })}
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
                    <tr className="bg-canvas text-left text-xs text-muted">
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
                          className={`group transition hover:bg-canvas ${
                            highlight ? "bg-brand-soft/60" : ""
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
                              next.yours ? "font-medium text-brand" : "text-muted"
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
          </Card>

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
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-brand" />
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
    <div className="rounded-xl border border-line bg-white px-4 py-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        <span className="text-xs text-muted">{note}</span>
      </p>
    </div>
  );
}
