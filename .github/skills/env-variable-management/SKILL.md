---
name: env-variable-management
description: Guide for adding environment variables. Use when adding new env vars to ensure all 4 locations are updated (code, Coolify, workflow, GitHub secrets).
---

# Environment Variable Management Skill

## Purpose

Ensure environment variables are properly configured across ALL required locations. Missing a location causes **production runtime crashes**.

## ⚠️ CRITICAL: 4 Locations Must Stay in Sync

When adding ANY new environment variable, you MUST update **ALL 4 locations**:

| #   | Location            | Purpose                | Where                                        |
| --- | ------------------- | ---------------------- | -------------------------------------------- |
| 1   | **Code**            | Read the variable      | `process.env.VAR_NAME`                       |
| 2   | **Coolify**         | Container runtime env  | Coolify dashboard → Application → Environment |
| 3   | **Deploy Workflow** | CI/CD build secrets    | `.github/workflows/deploy-coolify.yml`       |
| 4   | **GitHub Secrets**  | Actual secret values   | GitHub repo settings                         |

## Required vs Optional Pattern

### Required Variables (Fail Fast)

For variables that MUST exist in production, validate at startup or usage:

```typescript
const myVar = process.env.MY_REQUIRED_VAR;
if (!myVar) {
  throw new Error("MY_REQUIRED_VAR environment variable must be set");
}
```

### Optional Variables (Graceful Fallback)

For variables with defaults or optional features:

```typescript
const myVar = process.env.MY_OPTIONAL_VAR ?? "default-value";
```

## Current Required Secrets

These MUST be set in both **Coolify environment** and **GitHub Secrets**:

| Secret                  | Purpose                    |
| ----------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL`   | Backend API URL            |
| `HMAC_SECRET`           | API request signing        |
| `SENTRY_DSN`            | Error tracking             |
| `DEEPL_API_KEY`         | Translation service        |
| `STRIPE_SECRET_KEY`     | Payment processing         |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification       |
| `REVALIDATE_SECRET`     | Cache revalidation         |
| `COOLIFY_TOKEN`         | Deployment trigger (GitHub only) |
| `COOLIFY_WEBHOOK_URL`   | Deployment trigger (GitHub only) |

## Current Optional Secrets

| Secret                         | Purpose     | Fallback     |
| ------------------------------ | ----------- | ------------ |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS` | Analytics   | Disabled     |
| `NEXT_PUBLIC_GOOGLE_ADS`       | Ads         | Disabled     |
| `NEXT_PUBLIC_GOOGLE_MAPS`      | Maps        | Disabled     |
| `SENTRY_AUTH_TOKEN`            | Source maps | Warning only |
| `CLOUDFLARE_ZONE_ID`           | CDN purge   | Skipped      |
| `CLOUDFLARE_API_TOKEN`         | CDN purge   | Skipped      |
| `GOOGLE_PLACES_API_KEY`        | Places API  | Disabled     |
| `REDIS_URL`                    | Redis cache | Filesystem   |

## Step-by-Step: Adding a New Environment Variable

### Step 1: Add to Code

```typescript
// In your code file
const myVar = process.env.MY_NEW_VAR;
if (!myVar) {
  // Handle missing - throw for required, fallback for optional
}
```

### Step 2: Add to Coolify

1. Go to **Coolify dashboard** → your application
2. Go to **Environment Variables** tab
3. Add `MY_NEW_VAR` with the production value
4. Check "Build Variable" if needed during Docker build (e.g., `NEXT_PUBLIC_*` vars)
5. Redeploy for changes to take effect

### Step 3: Add to `deploy-coolify.yml`

If the variable is needed during CI build/test (e.g., `NEXT_PUBLIC_*` vars baked at build time):

```yaml
- name: Build Next.js application
  env:
    MY_NEW_VAR: ${{ secrets.MY_NEW_VAR }}
  run: yarn build
```

### Step 4: Add to GitHub Secrets

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `MY_NEW_VAR` with the actual value

### Step 5: Update Documentation (Optional but Recommended)

Add to the tables in this skill file.

## `NEXT_PUBLIC_` Prefix Rules

| Prefix            | Visibility      | Use Case                   |
| ----------------- | --------------- | -------------------------- |
| `NEXT_PUBLIC_*`   | Client + Server | Analytics IDs, public URLs |
| No prefix         | Server only     | API keys, secrets, tokens  |

**Security**: Never expose secrets to the client. API keys like `STRIPE_SECRET_KEY` must NOT have `NEXT_PUBLIC_` prefix.

**Important**: `NEXT_PUBLIC_*` vars are inlined at **build time**. They must be available both in Coolify (as build variables) and in the GitHub Actions workflow (for CI builds).

## Local Development

Create `.env.local` (gitignored) with your dev values:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api
HMAC_SECRET=dev-secret-for-testing
# ... other vars
```

## Common Mistakes

1. **Adding to code but not Coolify** → Runtime crash in container
2. **Adding to Coolify but not GitHub Secrets** → CI build fails
3. **Adding to workflow but not GitHub Secrets** → Empty value, validation fails
4. **Using `NEXT_PUBLIC_` for secrets** → Exposed to browser
5. **Forgetting local `.env.local`** → Dev environment broken
6. **Not marking `NEXT_PUBLIC_*` as build variable in Coolify** → Variable undefined in client bundle

## Checklist for New Env Variable

- [ ] Added `process.env.VAR_NAME` in code?
- [ ] Added to Coolify environment variables?
- [ ] If `NEXT_PUBLIC_*`: marked as build variable in Coolify?
- [ ] Added to `deploy-coolify.yml` if needed for CI?
- [ ] Added secret value in GitHub repo settings?
- [ ] Decided: required (throw) or optional (fallback)?
- [ ] Correct prefix: `NEXT_PUBLIC_` only for public values?
- [ ] Updated `.env.local` for local dev?
- [ ] Documented in this skill file (if persistent)?

## Files to Reference

- [.github/workflows/deploy-coolify.yml](../../workflows/deploy-coolify.yml) - CI/CD workflow
- Coolify dashboard → Application → Environment Variables
- GitHub repo → Settings → Secrets → Actions

## Testing Your Changes

After adding a new env var:

1. **Local**: Add to `.env.local`, run `yarn dev`
2. **CI dry-run**: Push to branch, check workflow logs
3. **Production**: Add to Coolify, merge to main, verify via `/api/health` endpoint
