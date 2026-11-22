// POST /api/send  { leadId }
// Sends the approved email. Refuses anything that is not `approved`, so
// nothing leaves without the human approval click on the lead page.
// Mock mode (no GMAIL_USER / GMAIL_APP_PASSWORD): logs the email, sets `sent`.

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { TALK_LINK_PLACEHOLDER, talkLink } from "@/lib/links";
import { getLead, serverSupabase, updateLead } from "@/lib/supabase-server";
import type { Lead } from "@/lib/types";

export const maxDuration = 30;

function buildBody(lead: Lead, origin: string): string {
  const link = talkLink(lead.id, origin);
  let body = (lead.email_final || lead.email_draft || "").trim();

  if (body.includes(TALK_LINK_PLACEHOLDER)) {
    body = body.split(TALK_LINK_PLACEHOLDER).join(link);
  }
  if (!body.includes(link)) {
    body += `\n\nTalk to our AI assistant (about a minute): ${link}`;
  }

  const sender = lead.seller_name || "The team";
  return [
    body,
    "",
    sender,
    "",
    "--",
    `You received this because ${sender} thought it might be relevant to ${lead.company || "your business"}.`,
    'To unsubscribe, reply with "unsubscribe" and you will not hear from us again.',
  ].join("\n");
}

export async function POST(req: Request) {
  let claimedId: string | null = null;
  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const mock = !user || !pass;

    // Check the address before claiming, so a missing email never flips status.
    const current = await getLead(leadId);
    if (!current) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (current.status === "approved" && !mock && !current.contact_email) {
      return NextResponse.json({ error: "Lead has no contact email." }, { status: 400 });
    }

    // Atomic claim approved -> sent. This is the human-approval gate, and it
    // also stops a double click from sending the same email twice.
    const { data: claimed, error: claimErr } = await serverSupabase()
      .from("leads")
      .update({ status: "sent" })
      .eq("id", leadId)
      .eq("status", "approved")
      .select("*")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) {
      const now = await getLead(leadId);
      return NextResponse.json(
        { error: `Lead is "${now?.status ?? current.status}". Only approved leads can be sent.` },
        { status: 409 },
      );
    }
    const lead = claimed as Lead;
    claimedId = lead.id;

    const subject = lead.email_subject || `A note from ${lead.seller_name || "us"}`;
    const text = buildBody(lead, new URL(req.url).origin);

    if (mock) {
      console.log(
        `[send] MOCK (Gmail not configured)\nTo: ${lead.contact_email}\nSubject: ${subject}\n\n${text}\n`,
      );
    } else {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
      await transport.sendMail({
        from: `"${(lead.seller_name || "Rehearsal Rep").replace(/"/g, "")}" <${user}>`,
        to: lead.contact_email!,
        subject,
        text,
      });
    }

    return NextResponse.json({ mock, lead });
  } catch (e) {
    console.error("[send]", e);
    // Failed after the claim: put it back to approved so the owner can retry.
    if (claimedId) {
      await updateLead(claimedId, { status: "approved" }).catch((err) =>
        console.error("[send] rollback failed:", err),
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
