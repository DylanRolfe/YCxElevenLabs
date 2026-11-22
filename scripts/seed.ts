// Inserts one lead in each status so every screen has something to show.
//   npm run seed

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { STATUSES, type LeadStatus, type NewLead } from "../lib/types";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and a Supabase key in .env.local first.");
  process.exit(1);
}

const seller = {
  seller_name: "Northside Bookkeeping",
  seller_pitch:
    "Monthly bookkeeping for cafes and restaurants. Flat fee, books closed by the 5th, no software to learn.",
};

const draft = {
  email_subject: "Month-end without the late nights",
  email_draft:
    "Hi Priya,\n\nI run Northside Bookkeeping. We do monthly bookkeeping for cafes, flat fee, books closed by the 5th.\n\nRather than trade emails, you can ask my AI assistant anything. It takes about a minute:\n\n[TALK_LINK]\n\nIf it is not a fit, no worries at all.",
};

const rehearsal = {
  panel_objections: [
    { persona: "Busy owner", objection: "I do not have time for a sales conversation.", would_click: "No", click_reason: "Looks like it will take longer than a minute." },
    { persona: "Skeptical owner", objection: "I am not sure an AI can answer my real questions.", would_click: "No", click_reason: "I do not trust talking to a bot." },
    { persona: "Price-sensitive owner", objection: "There is no price, so I assume it is expensive.", would_click: "Yes", click_reason: "Only to find out the cost." },
  ],
  predicted_objection: "I do not have time for this.",
  email_final:
    "Hi Priya,\n\nI run Northside Bookkeeping. We do monthly bookkeeping for cafes, flat fee, books closed by the 5th.\n\nI know you are short on time: this takes about a minute and there is nothing to install.\n\n[TALK_LINK]\n\nIf it is not a fit, no worries at all.",
};

const call = {
  call_need: "Stop losing two evenings every month to month-end admin.",
  call_objection: "Worried about the time it takes to switch bookkeepers.",
  call_next_step: "15 minute call with the owner next week.",
  call_interest: "medium",
  call_summary:
    "The prospect loses two evenings a month to month-end. Concerned about switching effort, agreed to a short call next week.",
};

const order = (status: LeadStatus) => STATUSES.indexOf(status);

const rows: NewLead[] = STATUSES.map((status, i) => ({
  ...seller,
  status,
  company: `Seed Cafe ${i + 1} (${status})`,
  contact_name: "Priya Nair",
  contact_title: "Owner",
  contact_email: `seed-${status}@example.com`,
  company_summary: "Independent cafe with two locations. Owner does the books at night.",
  ...(order(status) >= order("drafted") ? draft : {}),
  ...(order(status) >= order("rehearsed") ? rehearsal : {}),
  ...(order(status) >= order("talked") ? call : {}),
}));

async function main() {
  const supabase = createClient(url!, key!, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("leads").insert(rows).select("id,status");
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  for (const row of data ?? []) console.log(`${row.status.padEnd(10)} ${row.id}`);
}

main();
