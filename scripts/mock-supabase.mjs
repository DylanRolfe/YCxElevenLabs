// Tiny in-memory stand-in for the Supabase REST API (the `leads` table only).
// Lets the whole app and the panel run with no Supabase project:
//
//   npm run mock:db
//   .env.local:  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
//                NEXT_PUBLIC_SUPABASE_ANON_KEY=anything
//
// Supports what this repo uses: select, insert, update, delete, `eq` filters,
// `order`, `limit`, and single-object responses. Data is lost on restart.

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);
const leads = [];

const DEFAULTS = {
  status: "found",
  seller_name: null,
  seller_pitch: null,
  company: null,
  contact_name: null,
  contact_title: null,
  contact_email: null,
  company_summary: null,
  email_subject: null,
  email_draft: null,
  panel_objections: null,
  predicted_objection: null,
  email_final: null,
  call_need: null,
  call_objection: null,
  call_next_step: null,
  call_interest: null,
  call_summary: null,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Content-Range",
};

function send(res, status, body) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => resolve(raw ? JSON.parse(raw) : null));
  });
}

function matches(row, params) {
  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    if (value.startsWith("eq.") && String(row[key]) !== value.slice(3)) return false;
  }
  return true;
}

function sorted(rows, order) {
  if (!order) return rows;
  const [column, direction] = order.split(".");
  const sign = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) =>
    a[column] === b[column] ? 0 : a[column] > b[column] ? sign : -sign,
  );
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") return send(res, 204);
  if (url.pathname !== "/rest/v1/leads") {
    return send(res, 404, { message: `mock supabase: no route ${url.pathname}` });
  }

  const params = [...url.searchParams];
  const prefer = req.headers.prefer || "";
  const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
  const wantsRows = prefer.includes("return=representation");

  const reply = (status, rows) => {
    if (!wantsObject) return send(res, status, rows);
    if (rows.length === 1) return send(res, status, rows[0]);
    return send(res, 406, {
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
      details: `The result contains ${rows.length} rows`,
    });
  };

  try {
    if (req.method === "GET") {
      let rows = sorted(
        leads.filter((row) => matches(row, params)),
        url.searchParams.get("order"),
      );
      const limit = url.searchParams.get("limit");
      if (limit) rows = rows.slice(0, Number(limit));
      return reply(200, rows);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const created = (Array.isArray(body) ? body : [body]).map((row, i) => ({
        id: randomUUID(),
        ...DEFAULTS,
        ...row,
        // Distinct timestamps keep batch inserts in a stable order.
        created_at: new Date(Date.now() + i).toISOString(),
      }));
      leads.push(...created);
      return wantsRows ? reply(201, created) : send(res, 201);
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      const updated = leads.filter((row) => matches(row, params));
      updated.forEach((row) => Object.assign(row, body));
      return wantsRows ? reply(200, updated) : send(res, 204);
    }

    if (req.method === "DELETE") {
      const removed = leads.filter((row) => matches(row, params));
      removed.forEach((row) => leads.splice(leads.indexOf(row), 1));
      return wantsRows ? reply(200, removed) : send(res, 204);
    }

    return send(res, 405, { message: "method not allowed" });
  } catch (error) {
    return send(res, 400, { message: String(error) });
  }
}).listen(PORT, () => {
  console.log(`Mock Supabase (in-memory leads table) on http://localhost:${PORT}`);
});
