// POST /api/draft  { leadId }
// Writes email_subject + email_draft, sets `drafted`, then kicks off the
// rehearsal (Maritime when configured, otherwise the local panel script).

import { after, NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/supabase-server";
import { triggerRehearsal } from "../rehearse/maritime";
import { cannedEmail, draftWithClaude } from "./claude";
import { draftWithDeepSeek } from "./deepseek";

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

    const mock = !process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY;
    const email = process.env.DEEPSEEK_API_KEY
      ? await draftWithDeepSeek(lead)
      : process.env.ANTHROPIC_API_KEY
        ? await draftWithClaude(lead)
        : cannedEmail(lead);

    const updated = await updateLead(leadId, {
      email_subject: email.subject,
      email_draft: email.body,
      status: "drafted",
    });

    // Runs after the response is sent so the Draft button stays fast.
    after(async () => {
      try {
        const result = await triggerRehearsal(leadId);
        console.log("[draft] rehearsal:", result.message);
      } catch (e) {
        console.error("[draft] rehearsal trigger failed:", e);
      }
    });

    return NextResponse.json({ mock, lead: updated });
  } catch (e) {
    console.error("[draft]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
