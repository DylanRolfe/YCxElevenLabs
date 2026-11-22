-- Rehearsal Rep: the one shared table.
-- Paste this into the Supabase SQL editor and run it once.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'found',
  seller_name text,
  seller_pitch text,
  company text,
  contact_name text,
  contact_title text,
  contact_email text,
  company_summary text,
  email_subject text,
  email_draft text,
  panel_objections jsonb,
  predicted_objection text,
  email_final text,
  call_need text,
  call_objection text,
  call_next_step text,
  call_interest text,
  call_summary text,
  created_at timestamptz default now()
);

-- Status order: found > drafted > rehearsed > approved > sent > talked

-- Hackathon setup: no auth, so the browser (anon key) reads and writes directly.
-- Do not keep this for a real product.
alter table leads disable row level security;
grant all on table leads to anon, authenticated, service_role;
