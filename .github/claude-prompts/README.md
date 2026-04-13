# Claude Scheduled-Agent Prompts

Prompts consumed by the scheduled Claude Code remote triggers that analyze the
bot-generated GA4 and SEO audit issues each week.

## Files

- `ga4-weekly.md` — prompt for the `ga4-weekly-analyzer` trigger. Runs every
  Monday at 11:00 UTC; analyzes the most recent `📊 Weekly GA4 Dashboard` issue
  and posts an actionable comment.
- `seo-audit.md` — prompt for the `seo-audit-analyzer` trigger. Runs daily at
  10:00 UTC; exits early if no fresh audit issue exists; otherwise analyzes the
  most recent `📊 SEO Audit` issue and posts an actionable comment.

## Updating

1. Edit the relevant file here (this is the source of truth).
2. Run `python3 scripts/sync-claude-prompts.py` to push the new prompt to the
   live trigger config. The script prints the trigger name, content diff, and
   asks for confirmation before updating.

Keep prompts under ~700 words and self-contained — the remote agent starts
from zero context and only has what the prompt provides.
