// POST /api/leads  { company, contact_name, contact_title, contact_email,
//                    company_summary, sellerName, sellerPitch }
// Adds one lead by hand as `found`. Server-side because the live Supabase
// lets the browser's anon key read leads but not insert them.

import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";

const text = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const company = text(body.company);
    const contact_name = text(body.contact_name);
    const contact_email = text(body.contact_email);
    if (!company || !contact_name || !contact_email) {
      return NextResponse.json(
        { error: "company, contact_name and contact_email are required" },
        { status: 400 },
      );
    }

    const { data, error } = await serverSupabase()
      .from("leads")
      .insert({
        company,
        contact_name,
        contact_email,
        contact_title: text(body.contact_title),
        company_summary: text(body.company_summary),
        status: "found",
        seller_name: text(body.sellerName),
        seller_pitch: text(body.sellerPitch),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ lead: data });
  } catch (e) {
    console.error("[leads]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
