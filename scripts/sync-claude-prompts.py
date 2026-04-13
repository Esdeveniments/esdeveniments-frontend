#!/usr/bin/env python3
"""
Sync repo-managed Claude Code scheduled-agent prompts to their live triggers.

Reads the Markdown files in ``.github/claude-prompts/`` (one per trigger) and
updates the trigger's ``session_context.events[0].data.message.content`` via
the Anthropic claude.ai trigger API. Prints the diff before asking for
confirmation; use ``--yes`` to skip the prompt in CI.

The mapping between file → trigger id is hard-coded below. When adding a new
scheduled agent:

1. Add its prompt file to ``.github/claude-prompts/``.
2. Add an entry to ``PROMPT_TRIGGERS``.
3. Run this script.

Auth:

* ``CLAUDE_SESSION_KEY`` env var (recommended in CI) — the session cookie
  from claude.ai, used as ``Authorization: Bearer <token>`` against the
  trigger API.
* Otherwise the script prints the curl command you'd run manually so you can
  paste it elsewhere.

The expected curl shape:

    curl -X POST https://claude.ai/api/organizations/<org>/code/triggers/<id> \
      -H 'Authorization: Bearer $CLAUDE_SESSION_KEY' \
      -H 'Content-Type: application/json' \
      -d @payload.json

This script is intentionally dry by default — the source of truth lives in
``.github/claude-prompts/``; the API is downstream.
"""
import argparse
import difflib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PROMPT_DIR = REPO_ROOT / ".github" / "claude-prompts"

# Map prompt filename → trigger id (from RemoteTrigger list).
# Keep in sync with the scheduled agents at https://claude.ai/code/scheduled
PROMPT_TRIGGERS = {
    "ga4-weekly.md": "trig_01PDoLAeAJdCqzjqzWzxdJB5",
    "seo-audit.md": "trig_01BA1LESCsERS1F7ZGC61PNh",
}

API_BASE = "https://claude.ai/api/v1/code/triggers"


def load_prompt(filename: str) -> str:
    path = PROMPT_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


def fetch_trigger(trigger_id: str, token: str) -> dict:
    req = urllib.request.Request(
        f"{API_BASE}/{trigger_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def update_trigger(trigger_id: str, body: dict, token: str) -> dict:
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/{trigger_id}",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def current_prompt(trigger: dict) -> str:
    try:
        return trigger["job_config"]["ccr"]["events"][0]["data"]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return ""


def build_update_body(trigger: dict, new_prompt: str) -> dict:
    """Return the minimal update body — replace only the event content."""
    job_config = trigger["job_config"]
    events = job_config["ccr"]["events"]
    events[0]["data"]["message"]["content"] = new_prompt
    return {"job_config": job_config}


def show_diff(filename: str, old: str, new: str) -> bool:
    if old == new:
        print(f"  [=] {filename}: no changes")
        return False
    diff = difflib.unified_diff(
        old.splitlines(keepends=True),
        new.splitlines(keepends=True),
        fromfile=f"trigger/{filename}",
        tofile=f"repo/{filename}",
        n=2,
    )
    print(f"  [~] {filename}: diff:")
    sys.stdout.writelines(diff)
    print()
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Claude prompts to triggers.")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show diffs only, do not update the triggers.",
    )
    args = parser.parse_args()

    token = os.environ.get("CLAUDE_SESSION_KEY")
    if not token and not args.dry_run:
        print(
            "CLAUDE_SESSION_KEY env var not set. Run with --dry-run to preview, "
            "or export the session cookie from claude.ai.",
            file=sys.stderr,
        )
        return 2

    changes = []
    for filename, trigger_id in PROMPT_TRIGGERS.items():
        new_prompt = load_prompt(filename)
        if args.dry_run or not token:
            print(f"  [?] {filename}: unable to compare (dry-run or no token)")
            continue
        trigger = fetch_trigger(trigger_id, token)
        old_prompt = current_prompt(trigger)
        if show_diff(filename, old_prompt, new_prompt):
            changes.append((filename, trigger_id, trigger, new_prompt))

    if args.dry_run:
        return 0
    if not changes:
        print("Nothing to sync. All triggers match repo state.")
        return 0

    if not args.yes:
        ans = input(f"Apply {len(changes)} update(s)? [y/N] ").strip().lower()
        if ans not in ("y", "yes"):
            print("Aborted.")
            return 1

    for filename, trigger_id, trigger, new_prompt in changes:
        body = build_update_body(trigger, new_prompt)
        try:
            update_trigger(trigger_id, body, token)
            print(f"  [✓] {filename} → {trigger_id}")
        except urllib.error.HTTPError as e:
            print(f"  [✗] {filename}: HTTP {e.code} — {e.read().decode()}", file=sys.stderr)
            return 1

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
