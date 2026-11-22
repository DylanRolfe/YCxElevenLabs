# Build prompt: Rehearsal Rep MVP (hackathon scaffold)

You are building the base MVP for a hackathon project. Four people will build on top of it in parallel right after you finish, so the goal is a working skeleton with clean seams, not polish. Hard deadline: this must run end to end within about 30 minutes of work. Prefer the simplest thing that works. Do not add features that are not listed here.

## Context

- Event: YC Startups x ElevenLabs Hackathon, University of Waterloo, Sunday Nov 22, 2026. Submissions close 3:00 PM Eastern. Feature freeze 2:15 PM.
- Theme: build an AI coworker you would actually hire, one that does a real job start to finish.
- Judging: 25% works live on real input, 25% ElevenLabs and partner tools are central, 25% usefulness, 15% demo clarity, 10% creativity.
- Rules: fresh repo, only code written today. Must be a live working product.
- Team stack: Next.js (App Router, TypeScript), Supabase, Vercel. One Python script for the Expected Parrot step.

## The product

An AI sales rep for a solo business owner. It rehearses on a simulated version of the buyer before it emails them, then takes the conversation the moment they are curious.

Flow:

1. **Brief.** The owner enters their business name and a short pitch.
2. **Find.** Fiber AI returns target companies and the owner or decision maker. A manual add form is the fallback.
3. **Draft.** Claude writes one outreach email per lead.
4. **Rehearse.** An Expected Parrot (EDSL) panel of 3 to 5 AI personas modeled on that buyer lists objections. The top objection is saved as the predicted objection and the email is rewritten once to answer it.
5. **Approve and send.** The owner reviews and clicks approve. The email goes out with a link to a talk page. Nothing is ever sent without a human approval click.
6. **Talk.** The prospect opens the link and talks to an ElevenLabs voice agent that knows the seller and the prospect.
7. **Report.** After the call, a lead card shows need, real objection and next step, with the predicted objection beside the real one.

## The shared contract: one table

Every part of the system reads rows in one status and writes the next. Create this in Supabase and put the SQL in `supabase/schema.sql`.

```sql
create table leads (
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
```

Status order: `found` > `drafted` > `rehearsed` > `approved` > `sent` > `talked`.

| Status | Written by | Picked up by |
|---|---|---|
| found | `/api/find` or manual add | `/api/draft` |
| drafted | `/api/draft` | Python panel script |
| rehearsed | Python panel script | Approve button on dashboard |
| approved | Dashboard | `/api/send` |
| sent | `/api/send` | Prospect opens talk link |
| talked | `/api/postcall` webhook | Lead card on dashboard |

## What to build

### 1. Next.js app

Pages:

- `/` Owner dashboard.
  - Seller brief form (name, pitch). Store in localStorage and copy onto each new lead.
  - Target type input with a Find button that calls `/api/find`.
  - Manual add lead form (company, contact name, title, email, one line summary).
  - Leads list with a status badge per row. Poll Supabase every 3 seconds.
- `/lead/[id]` Lead detail.
  - Shows the draft email, the panel objections, the predicted objection and the final email.
  - Draft button (calls `/api/draft`) when status is `found`.
  - Approve and send button when status is `rehearsed`. It sets `approved` then calls `/api/send`.
  - When status is `talked`, shows the lead card: need, real objection, next step, interest, summary, and the predicted objection side by side with the real one.
  - Shows the talk link and a QR code for it.
- `/talk/[id]` Prospect talk page.
  - Loads the lead. Shows who the rep works for.
  - A Start conversation button that starts an ElevenLabs agent session using `@elevenlabs/react` `useConversation`, passing dynamic variables: `lead_id`, `seller_name`, `seller_pitch`, `prospect_name`, `prospect_company`, `company_summary`.
  - Shows the live transcript on screen.
  - States clearly that this is an AI and the conversation is recorded, before the start button.

API routes:

- `POST /api/find` body `{ targetType, sellerName, sellerPitch }`. Calls Fiber AI company and people search, inserts up to 5 leads as `found`.
- `POST /api/draft` body `{ leadId }`. Calls Claude to write `email_subject` and `email_draft` (under 120 words, plain, one clear ask, mentions the talk link placeholder). Sets `drafted`.
- `POST /api/send` body `{ leadId }`. Refuses unless status is `approved`. Sends `email_final` (or `email_draft` if empty) with nodemailer through Gmail SMTP using an app password. Appends the talk link, the sender name and an unsubscribe line. Sets `sent`.
- `POST /api/postcall`. ElevenLabs post-call webhook. Reads the `lead_id` dynamic variable and the data collection results, writes `call_need`, `call_objection`, `call_next_step`, `call_interest`, `call_summary`, sets `talked`.

### 2. Python panel script

`panel/panel.py`, run locally with `python panel/panel.py`.

- Polls Supabase every 5 seconds for leads with status `drafted`.
- For each lead, builds 3 to 5 EDSL agents with traits drawn from `contact_title`, `company` and `company_summary` (for example a busy owner, a skeptical owner, a price sensitive owner).
- Asks each persona two questions about `email_draft`: what is your main objection, and would you click the link (yes or no with a reason).
- Writes all answers to `panel_objections`, picks the most common objection as `predicted_objection`, asks an LLM to rewrite the email once to answer it, writes `email_final`, sets `rehearsed`.
- Include `panel/requirements.txt` and a `--once <lead_id>` flag for testing.

### 3. ElevenLabs agent setup notes

Write `docs/elevenlabs-agent.md` with exact values to paste into the ElevenLabs dashboard:

- System prompt using the dynamic variables above. The rep answers questions about the seller, asks what the prospect needs, surfaces their main concern, and proposes one next step. It never invents prices or facts that are not in the pitch.
- First message that says it is an AI assistant for the seller and that the conversation is recorded.
- Max call duration 90 seconds.
- Data collection fields: `need`, `main_objection`, `next_step`, `interest_level` (high, medium, low).
- Post-call webhook URL: `<deployed url>/api/postcall`.

## Mock mode (required)

Each integration must work without its key so four people can build in parallel.

- If `FIBER_API_KEY` is missing, `/api/find` inserts three realistic fake leads.
- If `ANTHROPIC_API_KEY` is missing, `/api/draft` writes a canned email.
- If Gmail variables are missing, `/api/send` logs the email and still sets `sent`.
- If `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is missing, `/talk/[id]` shows a Simulate call button that posts a fake payload to `/api/postcall`.
- `panel.py --mock` writes canned objections without calling EDSL.

Also add `scripts/seed.ts` that inserts one lead in each status.

## Environment variables

Create `.env.example` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
FIBER_API_KEY=
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=
ELEVENLABS_WEBHOOK_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
NEXT_PUBLIC_APP_URL=
EXPECTED_PARROT_API_KEY=
```

## Verify before you write integration code

Do not rely on memory for these. Look up the current docs and match them exactly:

- ElevenLabs Agents: the React SDK session start call and how dynamic variables are passed, and the post-call webhook payload shape (where dynamic variables and data collection results live, and how the signature is verified).
- Fiber AI: https://docs.fiber.ai for the company search and people search endpoints and auth header.
- Expected Parrot EDSL: current imports and how to run a survey over an agent list.

If a doc cannot be reached, write the call behind one small function with a clear TODO and keep mock mode working.

## Constraints

- No auth, no user accounts, no payments.
- No outbound phone calls and no Twilio. Voice happens only on the talk page.
- No automatic sending. `/api/send` must reject anything not in `approved`.
- Keep styling minimal: Tailwind, one clean layout, readable on a phone because prospects open the talk page there.
- One repo. Next.js app at the root, Python in `/panel`.

## Action items, in order

1. Scaffold the Next.js app with Tailwind and the Supabase client. Add `supabase/schema.sql` and `.env.example`.
2. Build the dashboard, lead detail and manual add form against Supabase.
3. Add `/api/draft`, `/api/find`, `/api/send` with mock mode.
4. Build `/talk/[id]` with the ElevenLabs session and the simulate fallback.
5. Add `/api/postcall` and the lead card with predicted versus real objection.
6. Write `panel/panel.py` with `--mock` and `--once`.
7. Write `docs/elevenlabs-agent.md` and `scripts/seed.ts`.
8. Run it in mock mode: add a lead, draft, run the panel in mock, approve, simulate a call, confirm the lead card appears. Fix anything that breaks.
9. Write a short `README.md`: setup steps, how to run the app and the panel, which file each of the four lanes owns, and what is mocked.

## File ownership after handoff

- Shukun: `/panel`
- Sean: `/app/page.tsx`, `/app/lead`, shared UI
- Dylan: `/app/talk`, `/app/api/postcall`, `docs/elevenlabs-agent.md`
- Kashyap: `/app/api/find`, `/app/api/draft`, `/app/api/send`

Keep these areas in separate files so four people can commit without merge conflicts.

## Definition of done

In mock mode, with only Supabase keys set, a lead goes from `found` to `talked` through the UI and the lead card shows the predicted objection beside the real one. The README says exactly how to turn on each real integration.
