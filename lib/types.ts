// The shared contract. Mirrors supabase/schema.sql.

export const STATUSES = [
  "found",
  "drafted",
  "rehearsed",
  "approved",
  "sent",
  "talked",
] as const;

export type LeadStatus = (typeof STATUSES)[number];

// One persona's answers, written by the panel (panel/panel.py or maritime-agent).
export type PanelAnswer = {
  persona: string;
  objection: string;
  would_click: string; // "Yes" | "No"
  click_reason: string;
};

export type Lead = {
  id: string;
  status: LeadStatus;
  seller_name: string | null;
  seller_pitch: string | null;
  company: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  company_summary: string | null;
  email_subject: string | null;
  email_draft: string | null;
  panel_objections: PanelAnswer[] | null;
  predicted_objection: string | null;
  email_final: string | null;
  call_need: string | null;
  call_objection: string | null;
  call_next_step: string | null;
  call_interest: string | null;
  call_summary: string | null;
  created_at: string;
};

export type NewLead = Partial<Omit<Lead, "id" | "created_at">>;
