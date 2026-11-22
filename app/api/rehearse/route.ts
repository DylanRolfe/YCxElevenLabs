// POST /api/rehearse  { leadId }
// Manual retry for the rehearsal. Also called (as a function) by /api/draft.

import { NextResponse } from "next/server";
import { getLead } from "@/lib/supabase-server";
import { triggerRehearsal } from "./maritime";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }
    const lead = await getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.status !== "drafted") {
      return NextResponse.json(
        { error: `Lead is "${lead.status}". Only drafted leads can be rehearsed.` },
        { status: 409 },
      );
    }
    return NextResponse.json(await triggerRehearsal(leadId));
  } catch (e) {
    console.error("[rehearse]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
