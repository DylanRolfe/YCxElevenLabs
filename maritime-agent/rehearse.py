"""Rehearsal panel: the single implementation.

Used by both:
  - panel/panel.py            (local polling script, the fallback)
  - maritime-agent/server.py  (hosted agent on Maritime, triggered by /chat)

Flow for one lead in status `drafted`:
  1. Build 3 EDSL agents (personas) from the lead's title, company and summary.
  2. Ask each: main objection to the email, and would you click the link.
  3. Pick the most common objection -> predicted_objection.
  4. Rewrite the email once to answer it -> email_final.
  5. Write everything to Supabase and set status `rehearsed`.

EDSL usage verified against edsl 1.0.9 and docs.expectedparrot.com (2026-11-22).
"""

from __future__ import annotations

import os
from pathlib import Path

import requests

TALK_LINK_PLACEHOLDER = "[TALK_LINK]"  # keep in sync with lib/links.ts

PERSONA_TEMPLATES = [
    (
        "Busy owner",
        "You are stretched thin and skim email between tasks. You ignore "
        "anything that looks like it will cost you time.",
    ),
    (
        "Skeptical owner",
        "You have been burned by vendors before. You distrust claims without "
        "proof and you are wary of anything automated or AI-driven.",
    ),
    (
        "Price-sensitive owner",
        "Margins are thin. Your first question about anything new is what it "
        "costs and whether it pays for itself.",
    ),
    (
        "Loyal-to-current-vendor owner",
        "You already have someone who handles this and switching feels risky.",
    ),
    (
        "Curious early adopter",
        "You like trying new tools, but only if getting started is easy.",
    ),
]


# --------------------------------------------------------------------------
# Environment and Supabase (plain REST, so there is no heavy client to install)
# --------------------------------------------------------------------------

def load_env() -> None:
    """Load .env.local / .env from the repo root when running locally."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    root = Path(__file__).resolve().parent.parent
    for name in (".env.local", ".env"):
        path = root / name
        if path.exists():
            load_dotenv(path, override=False)


def _supabase() -> tuple[str, dict]:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    if not url or not key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY (or the NEXT_PUBLIC_ pair in .env.local)."
        )
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return url.rstrip("/") + "/rest/v1/leads", headers


def get_lead(lead_id: str) -> dict | None:
    url, headers = _supabase()
    res = requests.get(
        url, headers=headers, params={"id": f"eq.{lead_id}", "select": "*"}, timeout=15
    )
    res.raise_for_status()
    rows = res.json()
    return rows[0] if rows else None


def get_drafted_leads() -> list[dict]:
    url, headers = _supabase()
    res = requests.get(
        url,
        headers=headers,
        params={"status": "eq.drafted", "select": "*", "order": "created_at.asc"},
        timeout=15,
    )
    res.raise_for_status()
    return res.json()


def update_lead(lead_id: str, fields: dict) -> None:
    url, headers = _supabase()
    res = requests.patch(
        url, headers=headers, params={"id": f"eq.{lead_id}"}, json=fields, timeout=15
    )
    res.raise_for_status()


# --------------------------------------------------------------------------
# The panel
# --------------------------------------------------------------------------

def build_personas(lead: dict, count: int = 3) -> list[dict]:
    """3 to 5 personas with traits drawn from the lead."""
    count = max(3, min(count, len(PERSONA_TEMPLATES)))
    title = lead.get("contact_title") or "Owner"
    company = lead.get("company") or "a small business"
    summary = lead.get("company_summary") or "No further details."
    return [
        {
            "name": name,
            "traits": {
                "persona": name,
                "mindset": mindset,
                "job_title": title,
                "company": company,
                "about_company": summary,
            },
        }
        for name, mindset in PERSONA_TEMPLATES[:count]
    ]


def _mock_panel(lead: dict, personas: list[dict]) -> dict:
    """Canned output for --mock: no EDSL, no keys."""
    canned = [
        ("I do not have time to sit through a sales conversation.", "No", "It looks like it will take longer than a minute."),
        ("I do not have time for this, and I am not sure an AI can answer my real questions.", "No", "I do not trust talking to a bot."),
        ("There is no price, so I assume it is expensive, and I have no time to find out.", "Yes", "I would click only to find out the cost."),
        ("I already have someone for this and no time to switch.", "No", "Switching is a hassle."),
        ("Sounds interesting but I cannot tell how much setup time it takes.", "Yes", "Happy to try if it is quick."),
    ]
    answers = [
        {
            "persona": p["name"],
            "objection": canned[i][0],
            "would_click": canned[i][1],
            "click_reason": canned[i][2],
        }
        for i, p in enumerate(personas)
    ]
    predicted = "I do not have time for this."
    draft = (lead.get("email_draft") or "").strip()
    reassurance = (
        "I know you are short on time: this takes about a minute, there is "
        "nothing to install, and you can stop whenever you like."
    )
    if TALK_LINK_PLACEHOLDER in draft:
        final = draft.replace(
            TALK_LINK_PLACEHOLDER, f"{reassurance}\n\n{TALK_LINK_PLACEHOLDER}", 1
        )
    else:
        final = f"{draft}\n\n{reassurance}"
    return {
        "panel_objections": answers,
        "predicted_objection": predicted,
        "email_final": final,
    }


def _model():
    """Fast model by default. Override with PANEL_MODEL / PANEL_SERVICE."""
    from edsl import Model

    name = os.getenv("PANEL_MODEL")
    if not name:
        return Model()  # EDSL's configured default
    service = os.getenv("PANEL_SERVICE")
    return Model(name, service_name=service) if service else Model(name)


def _run_kwargs() -> dict:
    kwargs: dict = {"progress_bar": False}
    # No Expected Parrot key (or PANEL_LOCAL_INFERENCE=1): call the provider
    # directly with OPENAI_API_KEY / ANTHROPIC_API_KEY from the environment.
    if os.getenv("PANEL_LOCAL_INFERENCE") == "1" or not os.getenv(
        "EXPECTED_PARROT_API_KEY"
    ):
        kwargs["disable_remote_inference"] = True
        kwargs["disable_remote_cache"] = True
    return kwargs


def _edsl_panel(lead: dict, personas: list[dict]) -> dict:
    from edsl import (
        Agent,
        AgentList,
        QuestionFreeText,
        QuestionYesNo,
        Scenario,
        Survey,
    )

    email = (lead.get("email_draft") or "").strip()
    model = _model()
    run_kwargs = _run_kwargs()

    agents = AgentList(
        [
            Agent(
                name=p["name"],
                traits=p["traits"],
                instruction=(
                    "You are the person described by these traits and you just "
                    "received a cold email. React honestly, as that person would."
                ),
            )
            for p in personas
        ]
    )

    q_objection = QuestionFreeText(
        question_name="objection",
        question_text=(
            "You received this cold email:\n\n{{ scenario.email }}\n\n"
            "In one sentence, what is your main objection to it?"
        ),
    )
    q_click = QuestionYesNo(
        question_name="click",
        question_text=(
            "You received this cold email:\n\n{{ scenario.email }}\n\n"
            "Would you click the link to talk to the sender's AI assistant? "
            "Give a one sentence reason in your comment."
        ),
    )

    # EDSL runs the interviews concurrently: one job, all personas in parallel.
    results = (
        Survey([q_objection, q_click])
        .by(Scenario({"email": email}))
        .by(agents)
        .by(model)
        .run(**run_kwargs)
    )
    rows = results.select(
        "agent.agent_name", "answer.objection", "answer.click", "comment.click_comment"
    ).to_dicts()

    answers = []
    for row in rows:
        click = str(row.get("click") or "").strip()
        valid = click in ("Yes", "No")  # empty when the model's answer failed validation
        answers.append(
            {
                "persona": str(row.get("agent_name") or ""),
                "objection": str(row.get("objection") or "").strip(),
                "would_click": click if valid else "Unknown",
                "click_reason": str(row.get("click_comment") or "").strip() if valid else "",
            }
        )
    objections = [a["objection"] for a in answers if a["objection"]]
    if not objections:
        raise RuntimeError("The panel returned no objections.")

    # One more job: pick the most common objection, then rewrite once (piped).
    q_top = QuestionFreeText(
        question_name="top",
        question_text=(
            "Several buyers gave these objections to the same cold email:\n\n"
            "{{ scenario.objections }}\n\n"
            "State the single most common objection as one short sentence, in "
            "the buyer's voice. Reply with the sentence only."
        ),
    )
    q_rewrite = QuestionFreeText(
        question_name="rewrite",
        question_text=(
            "Rewrite this cold email once so that it answers this objection: "
            "{{ top.answer }}\n\nEmail:\n\n{{ scenario.email }}\n\n"
            "Rules: under 120 words, plain text, keep the same sender, greeting "
            "and single ask, do not invent prices or facts that are not in the "
            "original, do not add a signature, and keep the literal text "
            f"{TALK_LINK_PLACEHOLDER} exactly once on its own line. "
            "Reply with the email body only."
        ),
    )
    second = (
        Survey([q_top, q_rewrite])
        .by(
            Scenario(
                {
                    "objections": "\n".join(f"- {o}" for o in objections),
                    "email": email,
                }
            )
        )
        .by(model)
        .run(**run_kwargs)
    )
    picked = second.select("answer.top", "answer.rewrite").to_dicts()[0]
    predicted = str(picked.get("top") or "").strip() or objections[0]
    final = str(picked.get("rewrite") or "").strip() or email
    if TALK_LINK_PLACEHOLDER in email and TALK_LINK_PLACEHOLDER not in final:
        final = f"{final}\n\n{TALK_LINK_PLACEHOLDER}"

    return {
        "panel_objections": answers,
        "predicted_objection": predicted,
        "email_final": final,
    }


def run_panel(lead: dict, mock: bool = False, persona_count: int = 3) -> dict:
    """Pure function: lead in, panel fields out. No database access."""
    personas = build_personas(lead, persona_count)
    return _mock_panel(lead, personas) if mock else _edsl_panel(lead, personas)


def rehearse_lead(lead_id: str, mock: bool = False, persona_count: int = 3) -> str:
    """Load a drafted lead, run the panel, write results, set `rehearsed`.

    Returns the predicted objection. Safe to call twice: a lead that is
    already past `drafted` is left alone.
    """
    lead = get_lead(lead_id)
    if not lead:
        raise LookupError(f"Lead {lead_id} not found.")
    if lead.get("status") != "drafted":
        return lead.get("predicted_objection") or (
            f"Lead is '{lead.get('status')}', not 'drafted'. Nothing to do."
        )
    if not (lead.get("email_draft") or "").strip():
        raise ValueError(f"Lead {lead_id} has no email_draft.")

    result = run_panel(lead, mock=mock, persona_count=persona_count)
    update_lead(lead_id, {**result, "status": "rehearsed"})
    return result["predicted_objection"]
