// Pushes the first message, system prompt and dynamic-variable placeholders
// from docs/elevenlabs-agent.md to the live ElevenLabs agent, so the agent
// actually reads {{seller_pitch}} (which carries the uploaded company brief).
//
// Usage:
//   npm run agent:check   compare the live agent with the doc, change nothing
//   npm run agent:sync    update the live agent to match the doc
//
// Needs NEXT_PUBLIC_ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in .env.local.
// Never prints key values.

import fs from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });
const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
const apiKey = process.env.ELEVENLABS_API_KEY;
const apply = process.argv.includes("--apply");

if (!agentId || !apiKey) {
  console.error("Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY in .env.local.");
  process.exit(1);
}

// The first fenced block after a heading in the doc.
function blockAfter(doc, heading) {
  const at = doc.indexOf(heading);
  if (at === -1) throw new Error(`"${heading}" not found in docs/elevenlabs-agent.md`);
  const match = doc.slice(at).match(/```[^\n]*\n([\s\S]*?)\n```/);
  if (!match) throw new Error(`No code block under "${heading}"`);
  return match[1].trim();
}

const doc = fs.readFileSync("docs/elevenlabs-agent.md", "utf8").replace(/\r\n/g, "\n");
const firstMessage = blockAfter(doc, "## 2. First message");
const prompt = blockAfter(doc, "## 3. System prompt");

// Dashboard test calls get these instead of runtime values.
const placeholders = {
  lead_id: "test",
  seller_name: "Northside Bookkeeping",
  seller_pitch: "We do monthly bookkeeping for small businesses so owners get their evenings back.",
  prospect_name: "Sam",
  prospect_company: "Harbour Street Coffee",
  company_summary: "An independent coffee shop with two locations.",
};

const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
const headers = { "xi-api-key": apiKey, "Content-Type": "application/json" };

async function getAgent() {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET agent failed (${res.status}): ${await res.text()}`);
  return res.json();
}

function report(agent) {
  const a = agent.conversation_config?.agent ?? {};
  const live = a.prompt?.prompt ?? "";
  const vars = [...live.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  const same = live.trim() === prompt && (a.first_message ?? "").trim() === firstMessage;
  console.log(`Agent: ${agent.name ?? agentId}`);
  console.log(`  Prompt matches doc:       ${same ? "yes" : "NO"}`);
  console.log(`  Prompt uses seller_pitch: ${vars.includes("seller_pitch") ? "yes" : "NO (the brief is ignored)"}`);
  console.log(`  Variables in live prompt: ${[...new Set(vars)].join(", ") || "none"}`);
  return same;
}

const before = await getAgent();
const inSync = report(before);

if (!apply) {
  if (!inSync) console.log("\nRun `npm run agent:sync` to update the agent.");
  process.exit(inSync ? 0 : 1);
}

// Keep a copy of what was there, in case the dashboard prompt is wanted back.
const backup = `scripts/.agent-backup-${Date.now()}.json`;
fs.writeFileSync(backup, JSON.stringify(before.conversation_config?.agent ?? {}, null, 2));
console.log(`\nSaved the previous agent settings to ${backup}`);

const res = await fetch(url, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    conversation_config: {
      agent: {
        first_message: firstMessage,
        prompt: { prompt },
        dynamic_variables: { dynamic_variable_placeholders: placeholders },
      },
    },
  }),
});
if (!res.ok) {
  console.error(`PATCH agent failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}

console.log("Updated. Live agent now:");
process.exit(report(await getAgent()) ? 0 : 1);
