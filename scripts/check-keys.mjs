// Checks every integration key in .env.local with a cheap, read-only call.
// Usage: npm run check   (never prints key values)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

config({ path: ".env.local" });
const env = process.env;
const ok = (n, m = "") => console.log(`  OK    ${n}${m ? "  " + m : ""}`);
const miss = (n, m) => console.log(`  MOCK  ${n}  (${m})`);
const fail = (n, e) => console.log(`  FAIL  ${n}  ${e}`);

async function check(name, vars, fn, mockNote) {
  const missing = vars.filter((v) => !env[v]);
  if (missing.length) return miss(name, `missing ${missing.join(", ")}: ${mockNote}`);
  try {
    const msg = await fn();
    ok(name, msg);
  } catch (e) {
    fail(name, e?.message ?? String(e));
  }
}

console.log("\nRehearsal Rep key check\n");

await check("Supabase", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], async () => {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
  if (/\/rest\/v1/.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
    throw new Error("URL must be just https://<ref>.supabase.co (remove /rest/v1/)");
  }
  const { error, count } = await sb.from("leads").select("*", { count: "exact", head: true });
  if (error || count == null) {
    throw new Error((error?.message || "no response") + " (did you run supabase/schema.sql?)");
  }
  const local = env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost") ? " [LOCAL MOCK]" : "";
  return `leads table reachable, ${count ?? "?"} rows${local}`;
}, "app will not start");

await check("DeepSeek (draft + panel)", ["DEEPSEEK_API_KEY"], async () => {
  const r = await fetch("https://api.deepseek.com/models", {
    headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  const bal = await fetch("https://api.deepseek.com/user/balance", {
    headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
  }).then((x) => x.json()).catch(() => null);
  return bal?.is_available === false ? "key works but NO BALANCE - top up" : "key works";
}, "canned email unless ANTHROPIC_API_KEY set; panel needs --mock");

await check("Anthropic (optional fallback)", ["ANTHROPIC_API_KEY"], async () => {
  const r = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
}, "canned email");

await check("ElevenLabs agent", ["NEXT_PUBLIC_ELEVENLABS_AGENT_ID"], async () => {
  if (!env.ELEVENLABS_API_KEY) return "agent id set (add ELEVENLABS_API_KEY to verify it exists)";
  const r = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID}`,
    { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  const a = await r.json();
  return `agent "${a.name}" found`;
}, "Simulate call button");

await check("ElevenLabs webhook secret", ["ELEVENLABS_WEBHOOK_SECRET"], async () => "set",
  "webhook accepted unsigned");

await check("Gmail SMTP", ["GMAIL_USER", "GMAIL_APP_PASSWORD"], async () => {
  const t = nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  });
  await t.verify();
  return "login works";
}, "email is only logged");

await check("Fiber AI (find)", ["FIBER_API_KEY"], async () => "set (not live-called, saves credits)",
  "three fake leads");
await check("Expected Parrot", ["EXPECTED_PARROT_API_KEY"], async () => "set", "optional: panel uses DEEPSEEK_API_KEY directly");
await check("Maritime", ["MARITIME_API_KEY", "MARITIME_AGENT_ID"], async () => "set",
  "run panel/panel.py locally instead");

const appUrl = env.NEXT_PUBLIC_APP_URL || "(unset)";
console.log(`\n  APP_URL = ${appUrl}${appUrl.includes("localhost") ? "  <- change to your Vercel URL before sending real emails" : ""}\n`);
