#!/usr/bin/env bash
# Fail if a page references a /_next/static JS or CSS file that doesn't load.
#
# Fetches each page the way a browser does (no cache-busting, so it sees what
# Cloudflare serves), then requests every /_next/static/*.js|css it references.
# Each asset must return 200 with a non-HTML content type. A 404 HTML body
# served as a script is exactly the unstyled, dead page users saw on 2026-11-08.
#
# Usage: scripts/check-static-assets.sh https://www.esdeveniments.cat / /barcelona
#
# Related: docs/incidents/2026-11-08-cloudflare-cached-chunk-404.md

set -uo pipefail

BASE_URL="${1:?usage: $0 BASE_URL PATH...}"
shift
[ "$#" -gt 0 ] || set -- /

failed=0
for path in "$@"; do
  html=$(curl -sS --max-time 15 "${BASE_URL}${path}") || html=""
  assets=$(printf '%s' "$html" | grep -oE '/_next/static/[^"'"'"'\\ )]+\.(js|css)' | sort -u)
  if [ -z "$assets" ]; then
    echo "::error::${path}: no /_next/static assets found in the HTML"
    failed=1
    continue
  fi

  total=0
  bad=0
  while IFS= read -r asset; do
    total=$((total + 1))
    result=$(curl -sS -o /dev/null --max-time 10 -w '%{http_code} %{content_type}' "${BASE_URL}${asset}") || result="000"
    case "$result" in
      "200 text/html"*) ;;
      200*) continue ;;
    esac
    bad=$((bad + 1))
    echo "  ${result} ${asset}"
  done <<< "$assets"

  if [ "$bad" -gt 0 ]; then
    echo "::error::${path}: ${bad}/${total} static assets failed to load"
    failed=1
  else
    echo "${path}: ${total} static assets OK"
  fi
done

exit "$failed"
