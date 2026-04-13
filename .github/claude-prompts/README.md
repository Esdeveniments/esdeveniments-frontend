# Claude Scheduled-Agent Prompts

Prompts consumed by the scheduled Claude Code remote triggers that analyze the
bot-generated GA4 and SEO audit issues each week.

## Files

- `ga4-weekly.md` — prompt for the `ga4-weekly-analyzer` trigger
  (`trig_01PDoLAeAJdCqzjqzWzxdJB5`). Runs every Monday at 11:00 UTC;
  analyzes the most recent `📊 Weekly GA4 Dashboard` issue and posts an
  actionable comment.
- `seo-audit.md` — prompt for the `seo-audit-analyzer` trigger
  (`trig_01BA1LESCsERS1F7ZGC61PNh`). Runs daily at 10:00 UTC; exits early
  if no fresh audit issue exists; otherwise analyzes the most recent
  `📊 SEO Audit` issue and posts an actionable comment.

## Editing + applying changes

These `.md` files are the source of truth. To apply a change to a live
trigger, edit + commit the file, then ask Claude Code:

> *"Sync the prompts in `.github/claude-prompts/` to the live triggers."*

Claude Code reads each file, fetches the current trigger config via the
`RemoteTrigger` tool (authenticated in-process — no tokens required from
you), shows you a diff per trigger, and applies the update on your
confirmation.

You can also manage triggers directly at <https://claude.ai/code/scheduled>.

## Writing guidelines

- Keep each prompt under ~700 words. The remote agent starts from zero
  context and only has what the prompt provides.
- First line of the posted comment body must be the agent's idempotency
  marker (`<!-- claude-ga4-analysis -->` / `<!-- claude-seo-analysis -->`)
  so re-runs skip already-analyzed issues.
- Reference concrete `file:line` locations for any code-level suggestion;
  the agent is instructed to read the file before citing it.
- Preserve the statistical and causation gates already in each prompt
  (n-gate, git-log check, "permission to say nothing") — these were added
  specifically to prevent LLM slop.
