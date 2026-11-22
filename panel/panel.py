"""Local rehearsal panel. The fallback when Maritime is not configured.

    python panel/panel.py                  # poll every 5s for `drafted` leads
    python panel/panel.py --mock           # canned objections, no EDSL, no keys
    python panel/panel.py --once <lead_id> # process one lead and exit
    python panel/panel.py --personas 5     # 3 to 5 personas (default 3)

The panel logic itself lives in maritime-agent/rehearse.py so the local script
and the hosted agent share one implementation.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "maritime-agent"))

import rehearse  # noqa: E402

POLL_SECONDS = 5
MAX_ATTEMPTS = 2  # stop retrying a lead that keeps failing


def process(lead_id: str, mock: bool, personas: int) -> bool:
    try:
        predicted = rehearse.rehearse_lead(lead_id, mock=mock, persona_count=personas)
        print(f"[panel] {lead_id} -> {predicted}", flush=True)
        return True
    except Exception as error:  # keep the loop alive
        print(f"[panel] {lead_id} failed: {error}", file=sys.stderr, flush=True)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Rehearsal Rep buyer panel")
    parser.add_argument("--mock", action="store_true", help="canned objections, no EDSL")
    parser.add_argument("--once", metavar="LEAD_ID", help="process one lead and exit")
    parser.add_argument("--personas", type=int, default=3, help="3 to 5 (default 3)")
    args = parser.parse_args()

    rehearse.load_env()

    if args.once:
        return 0 if process(args.once, args.mock, args.personas) else 1

    mode = "mock" if args.mock else "EDSL"
    print(f"[panel] polling every {POLL_SECONDS}s for drafted leads ({mode}). Ctrl+C to stop.", flush=True)
    attempts: dict[str, int] = {}
    try:
        while True:
            try:
                leads = rehearse.get_drafted_leads()
            except Exception as error:
                print(f"[panel] could not reach Supabase: {error}", file=sys.stderr, flush=True)
                leads = []
            for lead in leads:
                lead_id = lead["id"]
                if attempts.get(lead_id, 0) >= MAX_ATTEMPTS:
                    continue
                if not process(lead_id, args.mock, args.personas):
                    attempts[lead_id] = attempts.get(lead_id, 0) + 1
            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        print("\n[panel] stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
