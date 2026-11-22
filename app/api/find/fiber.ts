// Fiber AI lookup, kept behind one function so the route stays simple.
//
// Verified against https://docs.fiber.ai on 2026-11-22:
//   - Base URL https://api.fiber.ai, key sent as `apiKey` in the JSON body.
//   - POST /v1/nlp-search/run  body { apiKey, query, pageSize }
//     ("company-specific queries return companies, everything else returns people")
//   - POST /v1/contact-details/single  body { apiKey, linkedinUrl, enrichmentType }
//     response output.profile.emails[] = { email, type, status }
//
// TODO(Kashyap): the docs page was too long to read the nlp-search RESPONSE
// item schema, so the field names in `toLead` are best guesses taken from the
// people-search summary (name, headline, url, current_job.title,
// current_job.company_name). Run one real query, log the raw JSON
// (FIBER_DEBUG=1) and fix `findResultArray` / `toLead` to match.

import type { NewLead } from "@/lib/types";

const FIBER_BASE = "https://api.fiber.ai";

type Json = Record<string, unknown>;

async function fiberPost(path: string, body: Json, timeoutMs: number) {
  const res = await fetch(`${FIBER_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.FIBER_API_KEY, ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fiber ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as Json;
}

// The results array name is unconfirmed; take the first array of objects.
function findResultArray(output: unknown): Json[] {
  if (Array.isArray(output)) return output as Json[];
  if (!output || typeof output !== "object") return [];
  const obj = output as Json;
  for (const key of ["data", "results", "profiles", "people", "items"]) {
    if (Array.isArray(obj[key])) return obj[key] as Json[];
  }
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length && typeof value[0] === "object") {
      return value as Json[];
    }
  }
  return [];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toLead(item: Json): NewLead & { linkedinUrl: string | null } {
  const job = (item.current_job ?? {}) as Json;
  const first = str(item.first_name);
  const last = str(item.last_name);
  return {
    contact_name:
      str(item.name) ?? ([first, last].filter(Boolean).join(" ") || null),
    contact_title: str(job.title) ?? str(item.headline),
    company: str(job.company_name) ?? str(item.company_name),
    company_summary: str(item.headline),
    contact_email: null,
    linkedinUrl: str(item.url) ?? str(item.linkedin_url),
  };
}

async function revealWorkEmail(linkedinUrl: string): Promise<string | null> {
  try {
    const data = await fiberPost(
      "/v1/contact-details/single",
      {
        linkedinUrl,
        enrichmentType: {
          getWorkEmails: true,
          getPersonalEmails: false,
          getPhoneNumbers: false,
        },
      },
      25_000,
    );
    const profile = ((data.output ?? {}) as Json).profile as Json | undefined;
    const emails = (profile?.emails ?? []) as { email?: string; status?: string }[];
    const best = emails.find((e) => e.status === "valid") ?? emails[0];
    return best?.email ?? null;
  } catch (e) {
    console.warn("[fiber] email reveal failed:", e);
    return null;
  }
}

export async function findLeadsWithFiber(
  targetType: string,
  limit = 5,
): Promise<NewLead[]> {
  const data = await fiberPost(
    "/v1/nlp-search/run",
    { query: `Owners and founders of ${targetType}`, pageSize: limit },
    45_000,
  );
  if (process.env.FIBER_DEBUG) {
    console.log("[fiber] raw response:", JSON.stringify(data).slice(0, 4000));
  }

  const people = findResultArray(data.output)
    .slice(0, limit)
    .map(toLead)
    .filter((p) => p.contact_name || p.company);

  return Promise.all(
    people.map(async ({ linkedinUrl, ...lead }) => ({
      ...lead,
      contact_email: linkedinUrl ? await revealWorkEmail(linkedinUrl) : null,
    })),
  );
}
