# Rehearsal Rep

An AI sales rep for a solo business owner. It rehearses on a simulated version
of the buyer before it emails them, then takes the conversation the moment they
are curious.

**Brief > Find > Draft > Rehearse > Approve and send > Talk > Report**

Built for the YC Startups x ElevenLabs Hackathon (Waterloo, Nov 22, 2026).
Next.js (App Router, TypeScript), Supabase, Vercel, one Python panel
(Expected Parrot EDSL), ElevenLabs Agents, optional Maritime hosting.

## The shared contract

One table, `leads` ([supabase/schema.sql](supabase/schema.sql)). Each part reads
rows in one status and writes the next:

| Status | Written by | Picked up by |
|---|---|---|
| `found` | `/api/find` or manual add | `/api/draft` |
| `drafted` | `/api/draft` | Panel (Maritime agent or `panel/panel.py`) |
| `rehearsed` | Panel | Approve button on the lead page |
| `approved` | Lead page | `/api/send` |
| `sent` | `/api/send` | Prospect opens the talk link |
| `talked` | `/api/postcall` webhook | Lead card on the lead page |

Nothing is ever sent without the human approval click: `/api/send` returns 409
for any lead that is not `approved`.

## Setup

Needs Node 20+ and Python 3.10+.

```bash
npm install
cp .env.example .env.local
```

**Supabase (the only required integration).** Create a project, run
[supabase/schema.sql](supabase/schema.sql) in the SQL editor, then set
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

No Supabase project yet? Use the in-memory stand-in (data is lost on restart):

```bash
npm run mock:db
# .env.local
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=anything
```

## Run

```bash
npm run dev        # app on http://localhost:3000
npm run seed       # optional: one lead in each status
```

The panel, in a second terminal:

```bash
python -m venv panel/.venv
source panel/.venv/bin/activate          # Windows: panel\.venv\Scripts\activate
pip install -r panel/requirements.txt

python panel/panel.py --mock             # canned objections, no keys
python panel/panel.py                    # real EDSL panel, polls every 5s
python panel/panel.py --once <lead_id>   # one lead, then exit
python panel/panel.py --personas 5       # 3 to 5 personas (default 3)
```

### The mock walkthrough (only Supabase keys set)

1. Open `/`, enter your business name and pitch.
2. Click **Find leads** (three fake leads) or add one by hand.
3. Open a lead, click **Draft email**. Status: `drafted`.
4. With `python panel/panel.py --mock` running, it becomes `rehearsed` within
   5 seconds and shows the panel, the predicted objection and the final email.
5. Click **Approve and send**. The email is printed in the dev server log.
   Status: `sent`.
6. Open the talk link, click **Simulate call**. Status: `talked`.
7. Back on the lead page, the lead card shows the predicted objection beside
   the real one.

## Turning on each real integration

Every integration falls back to mock mode when its variables are missing.
Restart `npm run dev` after editing `.env.local`, and set the same values in
Vercel.

| Integration | Set | Mock behaviour when unset | Notes |
|---|---|---|---|
| Claude (draft) | `ANTHROPIC_API_KEY` | Canned email | Model `claude-opus-5-5`, structured output. [app/api/draft/claude.ts](app/api/draft/claude.ts) |
| Fiber AI (find) | `FIBER_API_KEY` | Three fake leads | **Response parsing is unverified.** See the TODO in [app/api/find/fiber.ts](app/api/find/fiber.ts); set `FIBER_DEBUG=1` to log the raw response. Email reveal costs credits. |
| Gmail (send) | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Email logged, lead still moves to `sent` | App password from Google Account > Security > 2-Step Verification > App passwords. |
| ElevenLabs (talk) | `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET` | **Simulate call** button | Agent setup: [docs/elevenlabs-agent.md](docs/elevenlabs-agent.md). Setting the webhook secret disables Simulate call. |
| Expected Parrot (panel) | `EXPECTED_PARROT_API_KEY` | Run with `--mock` | Optional `PANEL_MODEL` / `PANEL_SERVICE`. With a provider key instead, set `PANEL_LOCAL_INFERENCE=1`. |
| Maritime (hosted panel) | `MARITIME_API_KEY`, `MARITIME_AGENT_ID` | Lead stays `drafted` for the local script | Deploy steps: [docs/maritime-deploy.md](docs/maritime-deploy.md). |
| Talk links | `NEXT_PUBLIC_APP_URL` | Uses the request origin | Set to the deployed URL so emailed links work. |

Emails are drafted with the placeholder `[TALK_LINK]`; `/api/send` swaps in the
real link and appends the sender name and an unsubscribe line.

## Who owns what

Kept in separate files so four people can commit without merge conflicts.

| Lane | Owner | Files |
|---|---|---|
| Panel | Shukun | `panel/`, `maritime-agent/` (the panel logic is `maritime-agent/rehearse.py`, shared by both) |
| Dashboard and lead page | Sean | `app/page.tsx`, `app/lead/`, `components/` |
| Talk and report | Dylan | `app/talk/`, `app/api/postcall/`, `docs/elevenlabs-agent.md` |
| Find, draft, send | Kashyap | `app/api/find/`, `app/api/draft/`, `app/api/send/`, `app/api/rehearse/` |

Shared, change with care: `lib/types.ts` (the `Lead` type),
`lib/supabase*.ts`, `lib/links.ts`, `supabase/schema.sql`.

## Layout

```
app/
  page.tsx                 dashboard
  lead/[id]/               lead detail, LeadCard
  talk/[id]/               prospect page: VoiceCall (ElevenLabs), SimulateCall (mock)
  api/find|draft|rehearse|send|postcall/
components/                StatusBadge, small UI pieces
lib/                       types, Supabase clients, talk link helper
panel/panel.py             local polling panel (fallback)
maritime-agent/            hosted panel: server.py, start.py, rehearse.py, Dockerfile
scripts/seed.ts            one lead per status
scripts/mock-supabase.mjs  in-memory Supabase stand-in
supabase/schema.sql
docs/                      ElevenLabs agent setup, Maritime deploy
```

## Deploy

Push to GitHub, import into Vercel, add the env vars above. Then set the
ElevenLabs post-call webhook to `<deployed url>/api/postcall`.

## Known gaps

- Real integrations have not been run with live keys yet; only mock mode and
  the EDSL offline test model were exercised.
- Fiber response field names are best guesses (see the TODO).
- No auth: anyone with the URL can read and edit leads. Fine for the demo only.
