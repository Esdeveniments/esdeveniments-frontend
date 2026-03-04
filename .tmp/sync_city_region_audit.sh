#!/usr/bin/env bash
set -euo pipefail

repo="Esdeveniments/cultural-agenda-sync"
start="$(date -u -v-3d '+%Y-%m-%dT%H:%M:%SZ')"

PAGER=cat GH_PAGER=cat gh api --paginate "repos/$repo/actions/workflows/sync-gencat.yml/runs" \
  | jq -r --arg s "$start" '.workflow_runs[] | select(.created_at >= $s) | .id' > /tmp/sync_gencat_run_ids.txt

: > /tmp/sync_city_region_raw.log

while read -r rid; do
  [ -z "$rid" ] && continue
  job_id=$(PAGER=cat GH_PAGER=cat gh run view -R "$repo" "$rid" --json jobs | jq -r '.jobs[0].databaseId // empty')
  [ -z "$job_id" ] && continue

  gh api "repos/$repo/actions/jobs/$job_id/logs" \
    | grep -E 'Skipping \(no city match\)|Comarca:|AI suggested region .* no exact city match|Failed: .*timeout' \
    >> /tmp/sync_city_region_raw.log || true

done < /tmp/sync_gencat_run_ids.txt

# Top cities explicitly reported by comarca mapping
sed -n 's/.*city "\([^"]*\)" in .*(needs backend city).*/\1/p' /tmp/sync_city_region_raw.log \
  | grep -v '^null$' \
  | sort | uniq -c | sort -nr > /tmp/top_missing_cities_all.txt

# Top regions from AI "no exact city" messages
sed -n 's/.*AI suggested region "\([^"]*\)".*/\1/p' /tmp/sync_city_region_raw.log \
  | sort | uniq -c | sort -nr > /tmp/top_ai_regions_all.txt

# Regions where city is null in comarca line
sed -n 's/.*city "null" in \(.*\) (needs backend city).*/\1/p' /tmp/sync_city_region_raw.log \
  | sort | uniq -c | sort -nr > /tmp/top_null_city_regions_all.txt

# Build exact pair list (city,region,title)
{
  echo "type\trun_line"
  grep -E 'Comarca:|AI suggested region .* no exact city match|Skipping \(no city match\)|Failed: .*timeout' /tmp/sync_city_region_raw.log | sed 's/\t/ /g'
} > /tmp/city_region_exact_lines.tsv

echo "START=$start"
echo "RUNS=$(wc -l < /tmp/sync_gencat_run_ids.txt | tr -d ' ')"
echo "RAW_LINES=$(wc -l < /tmp/sync_city_region_raw.log | tr -d ' ')"
echo "OUT_TOP_CITIES=/tmp/top_missing_cities_all.txt"
echo "OUT_TOP_REGIONS=/tmp/top_ai_regions_all.txt"
echo "OUT_NULL_CITY_REGIONS=/tmp/top_null_city_regions_all.txt"
echo "OUT_EXACT_LINES=/tmp/city_region_exact_lines.tsv"

echo "\n=== TOP_MISSING_CITIES (first 20) ==="
head -n 20 /tmp/top_missing_cities_all.txt || true

echo "\n=== TOP_AI_REGIONS (first 20) ==="
head -n 20 /tmp/top_ai_regions_all.txt || true

echo "\n=== TOP_NULL_CITY_REGIONS (first 20) ==="
head -n 20 /tmp/top_null_city_regions_all.txt || true
