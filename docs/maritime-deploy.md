# Deploying the rehearsal agent on Maritime

The agent in `maritime-agent/` runs the Expected Parrot panel when the Next.js
app calls it, instead of relying on the local polling script. `panel/panel.py`
keeps working as the fallback; both import the same `rehearse.py`.

Checked against the Maritime docs on 2026-11-22:
[custom containers](https://maritime.sh/docs/frameworks/custom),
[REST API](https://maritime.sh/docs/api),
[CLI](https://maritime.sh/docs/cli).

## What Maritime requires (and where we meet it)

| Requirement | Where |
|---|---|
| `GET /health` returns 2xx fast | `server.py` |
| `POST /chat` takes `{message, source, conversation_id, context?}`, replies within 30s with text or `{"response": "..."}` | `server.py` (replies by 22s, otherwise `accepted` and finishes in the background) |
| Bind `0.0.0.0:$PORT`, never hardcode or set `PORT` | `start.py` |
| Dockerfile at the repo root, `ca-certificates` on slim images, exec-form `CMD` running a real program | `Dockerfile` |
| No polling or timers (the VM sleeps when idle) | all work starts from `/chat` |
| Only `/data` persists | the agent keeps no local state; everything is in Supabase |

## 1. Put the agent in its own repo

Maritime builds from a Dockerfile at the **repo root**, so `maritime-agent/`
must be the root of whatever you deploy. From this repo:

```bash
git subtree split --prefix maritime-agent -b maritime-agent-deploy
git push https://github.com/<you>/rehearsal-agent.git maritime-agent-deploy:main
```

(Or copy the folder into a new repo. The folder is self-contained.)

## 2. Install the CLI and create the agent

```bash
npm install -g maritime-cli
maritime login
maritime create rehearsal-agent --repo https://github.com/<you>/rehearsal-agent
```

Do not pass `--port`; the container reads the injected `PORT`.

## 3. Set secrets

```bash
maritime env set rehearsal-agent \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  EXPECTED_PARROT_API_KEY=<expected parrot key>
maritime env reload rehearsal-agent
```

Values are stored as encrypted secrets by default. Optional settings:

| Variable | Purpose |
|---|---|
| `PANEL_MODEL`, `PANEL_SERVICE` | Pick a fast model, for example `PANEL_MODEL=gpt-4o-mini`. Unset uses EDSL's default. |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` plus `PANEL_LOCAL_INFERENCE=1` | Call the model provider directly instead of Expected Parrot remote inference. Usually faster, which helps with the 30s limit. |
| `REPLY_BUDGET_SECONDS` | Seconds to wait before answering `accepted` (default 22). |
| `REHEARSE_MOCK=1` | Canned objections with no model calls. Good for a first deploy check. |

## 4. Test it

Get the agent id:

```bash
maritime list --json
```

Create a drafted lead in the app (add a lead, click Draft email), copy its id
from the URL, then:

```bash
curl -X POST https://api.maritime.sh/api/agents/<AGENT_ID>/chat \
  -H "Authorization: Bearer $MARITIME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "<LEAD_ID>"}'
```

Expected: `{"response": "<predicted objection>"}` and the lead row becomes
`rehearsed`. `{"response": "accepted"}` means the panel is still running; the
row flips to `rehearsed` shortly after. `{"response": "error: ..."}` carries
the failure reason.

From the CLI: `maritime chat rehearsal-agent "<LEAD_ID>"`.

API keys start with `mk_`. Create one with `maritime keys create`.

## 5. Connect the Next.js app

Set these in `.env.local` and in Vercel:

```
MARITIME_API_KEY=mk_...
MARITIME_AGENT_ID=<AGENT_ID>
```

Then `/api/draft` triggers the rehearsal automatically after it writes the
draft, and the **Rehearse** button on the lead page retries it
(`POST /api/rehearse { leadId }`). With either variable unset, the lead stays
`drafted` and `python panel/panel.py` picks it up.

## 6. Redeploy and debug

```bash
# after pushing changes to the agent repo
git subtree split --prefix maritime-agent -b maritime-agent-deploy
git push https://github.com/<you>/rehearsal-agent.git maritime-agent-deploy:main
maritime deploy rehearsal-agent --wait

maritime logs rehearsal-agent -f      # runtime logs
maritime history rehearsal-agent      # build and deploy attempts
maritime env list rehearsal-agent
```

## Run it locally first

```bash
cd maritime-agent
pip install -r requirements.txt
# bash
PORT=8090 REHEARSE_MOCK=1 SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=mock python start.py
curl localhost:8090/health
curl -X POST localhost:8090/chat -H "Content-Type: application/json" -d '{"message": "<LEAD_ID>"}'
```

## Known limits

- If a run takes longer than 22 seconds the agent answers `accepted` and keeps
  working. Maritime may put an idle VM to sleep, which pauses that background
  work until the next message. If a lead stays `drafted`, click Rehearse again;
  the call is safe to repeat.
- Not yet verified against a live Maritime deployment: the steps above follow
  the docs, and the container was tested locally with `REHEARSE_MOCK=1`.
