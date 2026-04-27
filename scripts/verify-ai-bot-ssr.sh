#!/usr/bin/env bash
# Verify that AI bot User-Agents receive full server-rendered HTML from
# production, not a cached PPR browser shell.
#
# Usage: ./scripts/verify-ai-bot-ssr.sh [https://www.esdeveniments.cat]
#
# Expected after Cloudflare Cache Rule is deployed:
#   - cf-cache-status: BYPASS or DYNAMIC (never HIT)
#   - No x-nextjs-postponed header
#   - h1 >= 1, h2 >= 1, at least several JSON-LD blocks
#
# Related: docs/incidents/2026-04-24-ai-bot-cdn-cache-mix.md

set -euo pipefail

BASE_URL="${1:-https://www.esdeveniments.cat}"
URL="$BASE_URL/"

BOTS=(
  "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)"
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot"
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"
  "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"
  "Mozilla/5.0 (compatible; ora-scan/1.0; +https://orank.ai)"
  "Mozilla/5.0 (compatible; DeepSeekBot/1.0; +https://deepseek.ai)"
)

fail=0
for ua in "${BOTS[@]}"; do
  name=$(echo "$ua" | grep -oE 'GPTBot|ChatGPT-User|ClaudeBot|PerplexityBot|ora-scan|DeepSeekBot' | head -1)
  tmp_headers=$(mktemp)
  tmp_body=$(mktemp)
  curl -sSL -A "$ua" -D "$tmp_headers" -o "$tmp_body" "$URL"

  cf_status=$(grep -i '^cf-cache-status:' "$tmp_headers" | awk '{print $2}' | tr -d '\r')
  postponed=$(grep -ic '^x-nextjs-postponed:' "$tmp_headers" || true)
  h1=$(grep -oc '<h1' "$tmp_body" || true)
  h2=$(grep -oc '<h2' "$tmp_body" || true)
  ld=$(grep -oc 'application/ld+json' "$tmp_body" || true)

  status="OK"
  if [[ "$cf_status" == "HIT" && "$postponed" -gt 0 ]]; then
    status="FAIL (cached PPR shell)"
    fail=1
  elif [[ "$h1" -eq 0 || "$h2" -eq 0 ]]; then
    status="FAIL (no headings)"
    fail=1
  fi

  printf "%-16s cf=%-8s postponed=%s h1=%s h2=%s ld=%s  %s\n" \
    "$name" "${cf_status:-?}" "$postponed" "$h1" "$h2" "$ld" "$status"

  rm -f "$tmp_headers" "$tmp_body"
done

if [[ "$fail" -eq 0 ]]; then
  echo ""
  echo "All bots receive full SSR. Re-scan at https://www.orank.ai/#scan"
  exit 0
else
  echo ""
  echo "At least one bot is still served a cached PPR shell."
  echo "Check that the Cloudflare Cache Rule (see docs/incidents/2026-04-24-ai-bot-cdn-cache-mix.md) is deployed and ordered above any generic cache rule."
  exit 1
fi
