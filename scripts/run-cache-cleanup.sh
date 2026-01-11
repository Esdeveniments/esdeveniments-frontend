#!/usr/bin/env bash
#
# Manually trigger the cache cleanup Lambda (dry run by default)
#
# Usage:
#   ./scripts/run-cache-cleanup.sh           # Dry run
#   ./scripts/run-cache-cleanup.sh --execute # Actually delete items
#
# Environment variables:
#   FUNCTION_NAME - Lambda function name (default: production)
#   AWS_REGION    - AWS region (default: eu-west-3)
#

set -euo pipefail

# Configurable via environment variables with production defaults
FUNCTION_NAME="${FUNCTION_NAME:-esdeveniments-frontend-production-CacheCleanupLambda}"
REGION="${AWS_REGION:-eu-west-3}"

if [[ "${1:-}" == "--execute" ]]; then
  echo "🚀 Running cache cleanup (LIVE MODE - will delete items)"
  PAYLOAD='{"dryRun": false}'
else
  echo "🔍 Running cache cleanup (DRY RUN - no items will be deleted)"
  PAYLOAD='{"dryRun": true}'
fi

echo ""
echo "Invoking Lambda: $FUNCTION_NAME"
echo ""

# Check if function exists
if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "❌ Lambda function not found: $FUNCTION_NAME"
  echo ""
  echo "The cleanup Lambda may not be deployed yet. Run 'sst deploy' first."
  echo ""
  echo "Alternatively, you can run the cleanup locally:"
  echo "  npx tsx scripts/cleanup-dynamo-cache.ts"
  exit 1
fi

# Invoke the function with proper output handling
OUTPUT_FILE=$(mktemp)
trap 'rm -f "$OUTPUT_FILE"' EXIT

if aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --payload "$PAYLOAD" \
  --cli-binary-format raw-in-base64-out \
  "$OUTPUT_FILE" >/dev/null 2>&1; then
  echo "Response:"
  jq '.' "$OUTPUT_FILE" 2>/dev/null || cat "$OUTPUT_FILE"
else
  echo "❌ Lambda invocation failed"
  cat "$OUTPUT_FILE" 2>/dev/null
  exit 1
fi
