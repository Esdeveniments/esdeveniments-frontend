#!/usr/bin/env bash
#
# Setup and run the staging integration E2E test.
#
# Usage:
#   HMAC_SECRET=<secret> ./scripts/e2e-staging-setup.sh
#
# What it does:
#   1. Registers a test user on the preproduction API
#   2. Attempts to login (will fail if email not verified — ask Gerard)
#   3. Sets GitHub secrets for CI
#   4. Runs the Playwright integration test
#
# Prerequisites:
#   - HMAC_SECRET env var set
#   - gh CLI authenticated
#   - Playwright installed (npx playwright install chromium)

set -euo pipefail

# ── Config ──
API_URL="https://api-preproduction.esdeveniments.cat"
TEST_EMAIL="${E2E_STAGING_EMAIL:-e2e-test@esdeveniments.cat}"
TEST_PASSWORD="${E2E_STAGING_PASSWORD:-}"
TEST_NAME="E2E Test User"

if [ -z "${HMAC_SECRET:-}" ]; then
  echo "❌ HMAC_SECRET is required. Run: HMAC_SECRET=<secret> $0"
  exit 1
fi

if [ -z "$TEST_PASSWORD" ]; then
  echo "❌ E2E_STAGING_PASSWORD is required. Run: E2E_STAGING_PASSWORD=<pass> $0"
  exit 1
fi

# ── HMAC helper ──
hmac_sign() {
  local path="$1"
  local timestamp
  timestamp=$(node -e "console.log(Date.now().toString())")
  # Backend HMAC format: body + timestamp + pathAndQuery
  # Auth endpoints use skipBodySigning (body = empty string)
  local data="${timestamp}${path}"
  local signature
  signature=$(echo -n "$data" | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print $2}')
  echo "$timestamp $signature"
}

# ── Step 1: Register ──
echo "📝 Registering test user: $TEST_EMAIL"
read -r ts hmac <<< "$(hmac_sign /api/auth/register)"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "x-timestamp: $ts" \
  -H "x-hmac: $hmac" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"$TEST_NAME\"}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -1)
BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ User registered successfully"
  echo "   Response: $BODY"
  echo ""
  echo "⚠️  IMPORTANT: Ask Gerard to verify the email for $TEST_EMAIL"
  echo "   Then re-run this script to continue with login + E2E test."
  echo ""
elif echo "$BODY" | grep -qi "already\|exists\|taken\|duplicate"; then
  echo "ℹ️  User already exists — continuing to login"
else
  echo "⚠️  Register returned HTTP $HTTP_CODE: $BODY"
  echo "   Continuing anyway (user may already exist)..."
fi

# ── Step 2: Try login ──
echo ""
echo "🔐 Attempting login..."
read -r ts hmac <<< "$(hmac_sign /api/auth/login)"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-timestamp: $ts" \
  -H "x-hmac: $hmac" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Login successful!"
  echo "   User: $(echo "$BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("user",{}).get("name","?"))' 2>/dev/null || echo '?')"
else
  echo "❌ Login failed (HTTP $HTTP_CODE): $BODY"
  if echo "$BODY" | grep -qi "not verified\|verification"; then
    echo ""
    echo "👉 The email needs verification. Ask Gerard to verify: $TEST_EMAIL"
    echo "   Then re-run this script."
  fi
  exit 1
fi

# ── Step 3: Set GitHub secrets ──
echo ""
echo "🔑 Setting GitHub secrets..."
if command -v gh &>/dev/null; then
  echo "$TEST_EMAIL" | gh secret set E2E_STAGING_EMAIL 2>/dev/null && echo "   ✅ E2E_STAGING_EMAIL set" || echo "   ⚠️ Failed to set E2E_STAGING_EMAIL"
  echo "$TEST_PASSWORD" | gh secret set E2E_STAGING_PASSWORD 2>/dev/null && echo "   ✅ E2E_STAGING_PASSWORD set" || echo "   ⚠️ Failed to set E2E_STAGING_PASSWORD"
else
  echo "   ⚠️ gh CLI not found — set secrets manually:"
  echo "   gh secret set E2E_STAGING_EMAIL   (value: $TEST_EMAIL)"
  echo "   gh secret set E2E_STAGING_PASSWORD (value: $TEST_PASSWORD)"
fi

# ── Step 4: Create .env.development ──
echo ""
echo "📄 Setting up .env.development..."
cat > .env.development <<EOF
HMAC_SECRET=$HMAC_SECRET
NEXT_PUBLIC_API_URL=${API_URL}/api
EOF
echo "   ✅ .env.development created"

# ── Step 5: Run E2E test ──
echo ""
echo "🧪 Running staging integration E2E test..."
echo "   Base URL: http://localhost:3000"
echo "   Test user: $TEST_EMAIL"
echo ""

E2E_STAGING_EMAIL="$TEST_EMAIL" \
E2E_STAGING_PASSWORD="$TEST_PASSWORD" \
npx playwright test e2e/publish-integration.spec.ts --config playwright.config.ts

echo ""
echo "🎉 Done!"
