// POST /api/send  { leadId }
// Sends the approved email. Refuses anything that is not `approved`, so
// nothing leaves without the human approval click on the lead page.
// Mock mode (no GMAIL_USER / GMAIL_APP_PASSWORD): logs the email, sets `sent`.

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { TALK_LINK_PLACEHOLDER, talkLink } from "@/lib/links";
import { getLead, updateLead } from "@/lib/supabase-server";
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
  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }
    const lead = await getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.status !== "approved") {
      return NextResponse.json(
        { error: `Lead is "${lead.status}". Only approved leads can be sent.` },
        { status: 409 },
      );
    }

    const subject = lead.email_subject || `A note from ${lead.seller_name || "us"}`;
    const text = buildBody(lead, new URL(req.url).origin);

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const mock = !user || !pass;

    if (mock) {
      console.log(
        `[send] MOCK (Gmail not configured)\nTo: ${lead.contact_email}\nSubject: ${subject}\n\n${text}\n`,
      );
    } else {
      if (!lead.contact_email) {
        return NextResponse.json(
          { error: "Lead has no contact email." },
          { status: 400 },
        );
      }
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });
      await transport.sendMail({
        from: `${lead.seller_name || "Rehearsal Rep"} <${user}>`,
        to: lead.contact_email,
        subject,
        text,
      });
    }

    const updated = await updateLead(leadId, { status: "sent" });
    return NextResponse.json({ mock, lead: updated });
  } catch (e) {
    console.error("[send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
