// POST /api/find  { targetType, sellerName, sellerPitch }
// Inserts up to 5 leads as `found`. Mock mode (no FIBER_API_KEY): 3 fake leads.

import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
import type { NewLead } from "@/lib/types";
import { findLeadsWithFiber } from "./fiber";

export const maxDuration = 60;

function mockLeads(targetType: string): NewLead[] {
  const kind = targetType.trim() || "local businesses";
  return [
    {
      company: "Harbour Street Coffee",
      contact_name: "Priya Nair",
      contact_title: "Owner",
      contact_email: "priya@harbourstreetcoffee.example",
      company_summary: `Two-location independent cafe (${kind}). Owner runs the books herself at night.`,
    },
    {
      company: "Maple & Rye Bakery",
      contact_name: "Daniel Okafor",
      contact_title: "Co-founder",
      contact_email: "daniel@mapleandrye.example",
      company_summary: `Wholesale and retail bakery (${kind}) with 12 staff and thin margins.`,
    },
    {
      company: "Greenline Bike Repair",
      contact_name: "Sofia Marchetti",
      contact_title: "Owner and head mechanic",
      contact_email: "sofia@greenlinebikes.example",
      company_summary: `Neighbourhood repair shop (${kind}), seasonal revenue, skeptical of software.`,
    },
  ];
}

export async function POST(req: Request) {
  try {
    const { targetType, sellerName, sellerPitch } = await req.json();
    if (!targetType || typeof targetType !== "string") {
      return NextResponse.json(
        { error: "targetType is required" },
        { status: 400 },
      );
    }

    const mock = !process.env.FIBER_API_KEY;
    const found = mock
      ? mockLeads(targetType)
      : await findLeadsWithFiber(targetType, 5);

    if (found.length === 0) {
      return NextResponse.json(
        { error: "Fiber returned no leads. Try a different target or add one by hand." },
        { status: 502 },
      );
    }

    const rows = found.slice(0, 5).map((lead) => ({
      ...lead,
      status: "found",
      seller_name: sellerName ?? null,
      seller_pitch: sellerPitch ?? null,
    }));

    const { data, error } = await serverSupabase()
      .from("leads")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);

    return NextResponse.json({ mock, leads: data });
  } catch (e) {
    console.error("[find]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
