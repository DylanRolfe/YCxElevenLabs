"""Rehearsal agent for Maritime (maritime.sh).

Container contract (maritime.sh/docs/frameworks/custom, checked 2026-11-22):
  GET  /health -> any 2xx, fast, no side effects
  POST /chat   -> JSON { message, source, conversation_id, context? }
                  reply within 30s with plain text or {"response": "..."}

`message` is a lead id, or JSON like {"lead_id": "..."}.
All work is triggered by /chat. There are no polling loops or timers,
because the VM sleeps when idle.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, Request

import rehearse

# Maritime allows 30s. Answer by 22s; slower runs finish in the background.
REPLY_BUDGET_SECONDS = float(os.getenv("REPLY_BUDGET_SECONDS", "22"))
MOCK = os.getenv("REHEARSE_MOCK") == "1"  # canned objections, no EDSL

UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I
)

app = FastAPI(title="Rehearsal Rep panel")
executor = ThreadPoolExecutor(max_workers=4)


def parse_lead_id(message: str) -> str | None:
    message = (message or "").strip()
    if message.startswith("{"):
        try:
            data = json.loads(message)
            lead_id = data.get("lead_id") or data.get("leadId")
            if lead_id:
                return str(lead_id)
        except json.JSONDecodeError:
            pass
    match = UUID_RE.search(message)
    return match.group(0) if match else None


def _log_background_result(lead_id: str, future) -> None:
    error = future.exception()
    if error:
        print(f"[agent] {lead_id} failed in background: {error}", flush=True)
    else:
        print(f"[agent] {lead_id} finished in background: {future.result()}", flush=True)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/chat")
async def chat(request: Request) -> dict:
    try:
        body = await request.json()
    except Exception:
        body = {}
    message = body.get("message") if isinstance(body, dict) else None
    lead_id = parse_lead_id(message if isinstance(message, str) else "")
    if not lead_id:
        return {"response": 'error: send a lead id, or JSON like {"lead_id": "..."}'}

    loop = asyncio.get_running_loop()
    future = loop.run_in_executor(executor, rehearse.rehearse_lead, lead_id, MOCK)
    try:
        predicted = await asyncio.wait_for(
            asyncio.shield(future), timeout=REPLY_BUDGET_SECONDS
        )
        return {"response": predicted}
    except asyncio.TimeoutError:
        # Keep working; the dashboard polls Supabase and will see `rehearsed`.
        future.add_done_callback(lambda f: _log_background_result(lead_id, f))
        return {"response": "accepted"}
    except Exception as error:
        print(f"[agent] {lead_id} failed: {error}", flush=True)
        return {"response": f"error: {error}"}
