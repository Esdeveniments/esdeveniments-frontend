#!/bin/bash
# SST Cache Recovery Script
# Use this when you see S3 "NoSuchBucket" or DynamoDB "tableName is null" errors

set -e

STAGE="${1:-production}"
SECRET="${REVALIDATE_SECRET:-}"

echo "🔧 SST Cache Recovery for stage: $STAGE"

if [ -z "$SECRET" ]; then
  echo "⚠️  REVALIDATE_SECRET not set. Health check will show limited info."
  echo "   Set it with: export REVALIDATE_SECRET=your-secret"
fi

echo ""
echo "Step 1: Checking current SST version..."
npx sst version

echo ""
echo "Step 2: Refreshing SST state (syncs with AWS)..."
npx sst refresh --stage "$STAGE"

echo ""
echo "Step 3: Deploying to recreate any missing resources..."
npx sst deploy --stage "$STAGE"

echo ""
echo "Step 4: Verifying deployment health..."
sleep 10

if [ "$STAGE" = "production" ]; then
  HEALTH_URL="https://www.esdeveniments.cat/api/health"
else
  HEALTH_URL="https://$STAGE.esdeveniments.cat/api/health"
fi

if [ -n "$SECRET" ]; then
  HEALTH_URL="${HEALTH_URL}?secret=${SECRET}"
fi

echo "Checking: $HEALTH_URL (secret ${SECRET:+provided}${SECRET:-not set})"
RESPONSE=$(curl -sf "$HEALTH_URL" 2>/dev/null || echo '{"status":"error"}')

# Redact sensitive info before displaying
echo "$RESPONSE" | jq 'del(.cache.s3.bucket, .cache.dynamodb.table)' || echo "$RESPONSE"

STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')
if [ "$STATUS" = "healthy" ]; then
  echo ""
  echo "✅ Recovery complete! Cache infrastructure is healthy."
else
  echo ""
  echo "⚠️  Recovery may not be complete. Status: $STATUS"
  echo ""
  echo "If issues persist, try the nuclear option (causes downtime):"
  echo "  npx sst remove --stage $STAGE"
  echo "  npx sst deploy --stage $STAGE"
fi
