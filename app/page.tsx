"use client";

// Owner dashboard: seller brief, find leads, manual add, live leads list.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, ErrorNote, Field, inputClass } from "@/components/ui";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

const SELLER_KEY = "rehearsal-rep-seller";
const POLL_MS = 3000;

const EMPTY_LEAD = {
  company: "",
  contact_name: "",
  contact_title: "",
  contact_email: "",
  company_summary: "",
};

export default function Dashboard() {
  const [sellerName, setSellerName] = useState("");
  const [sellerPitch, setSellerPitch] = useState("");
  const [targetType, setTargetType] = useState("");
  const [form, setForm] = useState(EMPTY_LEAD);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [finding, setFinding] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    loadLeads();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">Rehearsal Rep</h1>
        <p className="text-sm text-slate-600">
          Your AI sales rep. It rehearses on a simulated buyer before it emails
          the real one.
        </p>
      </header>

      {!supabaseConfigured && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Supabase is not configured. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code>, set the Supabase URL and anon key, then
          restart <code>npm run dev</code>.
        </p>
      )}
      <ErrorNote message={error} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="1. Your business">
          <div className="space-y-3">
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

        <Card title="2. Find leads">
          <div className="space-y-3">
            <Field label="Who do you want to reach?">
              <input
                className={inputClass}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                placeholder="Independent coffee shops in Toronto"
              />
            </Field>
            <Button
              onClick={findLeads}
              disabled={finding || !sellerReady || targetType.trim() === ""}
            >
              {finding ? "Finding..." : "Find leads"}
            </Button>
            {!sellerReady && (
              <p className="text-xs text-slate-500">
                Fill in your business name and pitch first.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Or add a lead by hand">
        <form onSubmit={addLead} className="grid gap-3 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <Button type="submit" disabled={adding || !sellerReady}>
              {adding ? "Adding..." : "Add lead"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Leads (${leads.length})`}>
        {leads.length === 0 ? (
          <p className="text-sm text-slate-500">
            {loaded ? "No leads yet. Find some or add one above." : "Loading..."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/lead/${lead.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {lead.company || "Unknown company"}
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {lead.contact_name}
                      {lead.contact_title ? `, ${lead.contact_title}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
