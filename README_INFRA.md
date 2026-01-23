# 🏗️ Infrastructure & Deployment (AWS/SST)

**Date:** December 1, 2025
**Status:** 🟢 Migrated from Vercel to AWS (SST)

## 🌍 The Stack (High Level)

We have moved away from Vercel to a self-hosted serverless architecture on AWS using **SST (Ion/v3)**. This gives us full control, lower costs, and "always-on" performance.

| Component       | Technology         | Details                       |
| :-------------- | :----------------- | :---------------------------- |
| **Framework**   | Next.js (OpenNext) | Running in `standalone` mode  |
| **Compute**     | AWS Lambda         | `eu-west-3` (Paris)           |
| **CDN**         | AWS CloudFront     | Global Edge Caching           |
| **Deploy Tool** | SST v3 (Ion)       | Infrastructure as Code (IaC)  |
| **DNS**         | Cloudflare         | Proxies traffic to CloudFront |

---

## 🚀 How It Works

### 1. The Request Flow

`User (Browser)` -> `Cloudflare (DNS/WAF)` -> `AWS CloudFront (CDN)` -> `AWS Lambda (Server)`

### 2. Environments

We use a **single AWS account** but separate resources.

- **Production (`www`)**: The live site.
- **Staging (`pre`)**: Points to the _same_ production infrastructure but uses the `pre.esdeveniments.cat` domain.
  - _Note:_ `pre` is hidden from Google via Middleware (`X-Robots-Tag: noindex`).

### 3. Configuration (`sst.config.ts`)

Our infrastructure is defined in code. Key optimizations we applied:

- **Warm Instances (`warm: 5`):** Keeps 5 server instances awake 24/7 to prevent "Cold Starts."
- **Memory (`3008 MB`):** 3 GB memory = **3 vCPUs** (AWS Lambda maximum for arm64 architecture in eu-west-3).
- **Architecture (`arm64`):** Uses AWS Graviton processors (cheaper & faster than x86).

---

## 🛠️ Development & Deployment

### Environment Variables

**For GitHub Actions (CI/CD):**
- The workflow automatically creates `.env.production` from GitHub Secrets
- No manual `.env` file management needed

**For Local Development:**
- Uses `.env.local` for local dev server (`yarn dev`)
- For manual deployments, you need `.env.production` in the root

### Deploying to Production

#### Automatic Deployment (Recommended) ✅

**Automatic deployment happens via GitHub Actions** when you push or merge to `main`:

1. ✅ **Cleans build cache** - Removes stale `.next`, `.sst`, and `.open-next` directories
2. ✅ **Creates `.env.production`** - Builds environment file from GitHub Secrets with validation
3. ✅ **Validates required secrets** - Fails fast if `NEXT_PUBLIC_API_URL`, `HMAC_SECRET`, or `SENTRY_DSN` are missing
4. ✅ **Builds Next.js app** - Runs production build with correct environment variables
5. ✅ **Deploys to AWS** - Updates Lambda functions, CloudFront, and S3 assets
6. ✅ **Invalidates cache** - Ensures users get the latest version

**Workflow:** `.github/workflows/deploy-sst.yml`

**No manual steps required!** Just merge to `main` and deployment happens automatically.

#### Manual Deployment (Local)

For manual deployments from your local machine:

```bash
# Ensure you have .env.production with all required variables
npx sst deploy --stage production
```

**Note:** The workflow sets `NODE_ENV=production`, so Next.js automatically loads `.env.production` during build.

---

## ⚠️ Critical Maintenance Notes

### 1. Image Optimization

We use a dedicated Lambda for `next/image`.

- **Fixing 403 Errors:** If images break, check the `siteImageOptimizerFunction` in AWS Lambda Console. It must have **Function URL** enabled with `Auth: NONE` and a permission policy allowing `*` to `InvokeFunctionUrl`.

#### Image Caching Strategy

We use an **aggressive 1-year CloudFront TTL** (`minimumCacheTTL: 31536000` in `next.config.js`) to minimize Lambda invocations and reduce costs. Cache-busting is handled via URL query parameters (`?v=<key>`) rather than relying on short TTLs.

**How it works:**

1. **Cache Key Generation:** Images receive cache-busting query parameters based on their content:

   - **News images:** `updatedAt || slug || id` (see `utils/news-cache.ts`)
   - **Event images:** `hash || updatedAt` (see `lib/validation/event.ts`)
   - **Cloudinary uploads:** `public_id` (see `components/ui/restaurantPromotion/CloudinaryUploadWidget.tsx`)

2. **URL Transformation:** The `withImageCacheKey()` function in `utils/image-cache.ts` appends `?v=<key>` to image URLs. When an image is updated:

   - The cache key changes (e.g., `updatedAt` timestamp updates)
   - The URL changes (e.g., `image.jpg?v=old-key` → `image.jpg?v=new-key`)
   - CloudFront treats it as a new resource and fetches the updated image

3. **Benefits:**
   - **Performance:** Long TTL means images are served from CloudFront edge locations globally
   - **Cost:** Fewer Lambda invocations for image optimization
   - **Reliability:** Updates are immediate (no waiting for cache expiration)

**For Maintainers:**

- When updating images, ensure the source data (event `hash`, news `updatedAt`, Cloudinary `public_id`) changes
- The cache-busting happens automatically via normalization functions in `lib/api/*` and `utils/news-cache.ts`
- If images don't update after changes, verify the cache key source field is being updated in the API response

### 2. The "6MB Trap"

AWS Lambda has a hard limit of **6MB** for request/response bodies.

- **DO NOT** send large files to API routes. Use S3 Presigned URLs for uploads.
- **DO NOT** return massive JSON objects (>5MB) from API routes. Always paginate.

### 3. Middleware & Indexing

We use `middleware.ts` to block search engines on the `pre` subdomain.

- If you see `X-Robots-Tag: noindex` on Production, something is wrong with the `host` check in middleware.

### 4. CloudFront Settings (Manual)

Some settings are managed manually in the AWS Console (because SST doesn't expose them yet):

- **HTTP/3:** Enabled manually in CloudFront Distribution settings -> "Supported HTTP versions" -> "HTTP/2 and HTTP/3".

### 5. Uptime Monitoring

We have an automated uptime monitor that runs every 15 minutes via GitHub Actions (`.github/workflows/uptime.yml`).

- **What it checks:** HTTP status code (must be 200) and page content (must contain "esdeveniments.cat")
- **Email alerts:** Configured to send email notifications when the site is down
- **Required GitHub Secrets:**
  - `SMTP_SERVER`: SMTP server address (e.g., `smtp.gmail.com` or `email-smtp.eu-west-3.amazonaws.com` for AWS SES)
  - `SMTP_PORT`: SMTP port (typically `587` for TLS or `465` for SSL)
  - `SMTP_USERNAME`: SMTP username/access key
  - `SMTP_PASSWORD`: SMTP password/secret key
  - `SMTP_FROM`: Email address to send from (e.g., `alerts@esdeveniments.cat`)
  - `UPTIME_ALERT_EMAIL`: Email address(es) to receive alerts (comma-separated for multiple recipients)

**Setting up email notifications:**

1. Choose an SMTP provider (Gmail, AWS SES, SendGrid, etc.)
2. Configure the secrets in GitHub: **Settings** → **Secrets and variables** → **Actions**
3. Test by manually triggering the workflow: **Actions** → **Uptime Monitor** → **Run workflow**

**Note:** For AWS SES, you'll need to verify both the sender and recipient email addresses in the SES console before emails can be sent.

#### AWS CloudWatch Alarms (Native AWS Monitoring)

In addition to the GitHub Actions uptime monitor, you can set up AWS-native alarms for faster detection:

**Existing Alarms (configured in `sst.config.ts`):**
- ✅ **Lambda Errors Alarm**: Alerts when Lambda function errors exceed 10 in 1 minute
- ✅ **Lambda Throttling Alarm**: Alerts when Lambda throttles exceed 5 in 1 minute
- 📧 **SNS Topic**: All alarms send email to `ALARM_EMAIL` (defaults to `esdeveniments.catalunya.cat@gmail.com`)

**To add CloudFront 5xx Error Alarm (Website Down Detection):**

1. **Get CloudFront Distribution ID:**
   - AWS Console → CloudFront → Distributions
   - Find distribution for `esdeveniments.cat`
   - Copy the Distribution ID (starts with `E...`)

2. **Create CloudWatch Alarm:**
   - AWS Console → CloudWatch → Alarms → Create alarm
   - **Metric:** `AWS/CloudFront` → `5xxErrorRate`
   - **Dimensions:** Select your CloudFront Distribution ID
   - **Statistic:** `Average`
   - **Period:** `5 minutes`
   - **Threshold:** `Greater than 0` (alert on any 5xx errors)
   - **SNS Topic:** Select `SiteAlarms` topic (created by SST)
   - **Alarm name:** `CloudFront-5xx-Errors`

3. **Optional: CloudWatch Synthetics Canary (Comprehensive Uptime Check):**
   - AWS Console → CloudWatch → Synthetics → Create canary
   - **Template:** `Heartbeat monitoring`
   - **URL:** `https://www.esdeveniments.cat`
   - **Frequency:** `Every 5 minutes`
   - **Alarm:** Create alarm when canary fails → Select `SiteAlarms` SNS topic

**Benefits of AWS Alarms:**
- ⚡ **Faster detection**: Alarms trigger immediately (vs 15-minute GitHub Actions)
- 🔔 **Multiple channels**: Can add SMS, Slack, PagerDuty integrations to SNS topic
- 📊 **Better visibility**: CloudWatch dashboards show historical uptime trends
- 💰 **Cost**: CloudWatch alarms are free; Synthetics Canary costs ~$0.0012 per run (~$0.10/month)

---

## 🔄 On-Demand Cache Revalidation

When adding new towns/places to the backend, use the `/api/revalidate` endpoint to immediately clear all caches.

### What Gets Cleared

| Cache Layer | Mechanism |
|-------------|-----------|
| **Next.js Data Cache** | `revalidateTag()` |
| **Lambda In-Memory Cache** | `clearPlacesCaches()`, etc. |
| **Cloudflare CDN** | API prefix purge (if configured) |

### Usage

```bash
curl -X POST https://www.esdeveniments.cat/api/revalidate \
  -H "Content-Type: application/json" \
  -H "x-revalidate-secret: YOUR_REVALIDATE_SECRET" \
  -d '{"tags": ["places", "regions", "regions:options", "cities"]}'
```

### Response

```json
{
  "revalidated": true,
  "tags": ["places", "regions", "regions:options", "cities"],
  "cloudflare": {
    "purged": true,
    "prefixes": ["/api/places", "/api/regions", "/api/regions/options", "/api/cities"]
  },
  "timestamp": "2025-12-07T08:00:00.000Z"
}
```

### Allowed Tags

Only these tags can be revalidated (security whitelist):
- `places` - All place data
- `regions` - Region list
- `regions:options` - Region/city dropdown data
- `cities` - City list
- `categories` - Category list

### Setting Up Cloudflare Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use template: **Custom token**
4. Permissions: **Zone** → **Cache Purge** → **Purge**
5. Zone Resources: **Include** → **Specific zone** → `esdeveniments.cat`
6. Click **Create Token** and copy it

---

## 🚑 Troubleshooting

| Problem                  | Cause              | Fix                                                                                               |
| :----------------------- | :----------------- | :------------------------------------------------------------------------------------------------ |
| **Images 403 Forbidden** | Lambda Permissions | Go to AWS Lambda -> `ImageOptimizer` -> Add Permission `InvokeFunctionUrl` for Principal `*`.     |
| **Site "Looping"**       | CloudFront Origin  | Ensure Cloudflare points to the **CloudFront URL** (`d123...cloudfront.net`), NOT the Lambda URL. |
| **Slow Initial Load**    | Cold Start         | Check `sst.config.ts` has `warm: 5`. Check AWS Lambda "Provisioned Concurrency" metrics.          |
| **Env Vars Missing**     | Build Process      | Did you deploy without `.env`? Re-run `npx sst deploy`.                                           |
| **API returns "Unauthorized"** | Secret not deployed | Add secret to GitHub Secrets AND `deploy-sst.yml`. See checklist below. |
| **robots.txt returns 403** | OpenNext Routing Priority | See [robots.txt Issues Documentation](../docs/robots-txt-issues.md) for complete troubleshooting guide. |

> **📖 Detailed Documentation:** For the complete `robots.txt` troubleshooting journey, including all three issues encountered and the final workaround, see [`docs/robots-txt-issues.md`](../docs/robots-txt-issues.md).

---

## 🔐 GitHub Secrets Setup (for CI/CD)

For automatic deployment to work, configure these secrets in GitHub:

> [!IMPORTANT]
> **When adding new runtime environment variables**, you must do **BOTH**:
> 1. Add the secret in GitHub: **Settings → Secrets → Actions → New secret**
> 2. Update `.github/workflows/deploy-sst.yml` to include the secret in the env block AND write it to `.env.production`
>
> Missing either step will cause the variable to be undefined at runtime!

### Required Secrets

| Secret Name              | Description                                      | Example Value                           |
| ------------------------ | ------------------------------------------------ | --------------------------------------- |
| `AWS_ACCESS_KEY_ID`      | AWS IAM user access key for deployment           | `AKIA...`                               |
| `AWS_SECRET_ACCESS_KEY`  | AWS IAM user secret key                          | `wJal...`                               |
| `HMAC_SECRET`            | Server-side HMAC secret for API request signing  | (random secure string)                  |
| `REVALIDATE_SECRET`      | Secret for on-demand cache revalidation API      | (random secure string, 32+ chars)       |
| `SENTRY_DSN`             | Sentry DSN for server-side error tracking        | `https://...@sentry.io/...`             |
| `NEXT_PUBLIC_API_URL`    | Production API backend URL                       | `https://api-pre.esdeveniments.cat/api` |
| `DEEPL_API_KEY`          | DeepL API key for translation services           | (DeepL API authentication key)          |
| `STRIPE_SECRET_KEY`      | Stripe secret key for sponsor checkout           | `sk_live_...`                           |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook signing secret (prevents bypass)  | `whsec_...`                             |

### Optional Secrets (Recommended)

| Secret Name                          | Description                                | Used For            |
| ------------------------------------ | ------------------------------------------ | ------------------- |
| `CLOUDFLARE_ZONE_ID`                 | Cloudflare Zone ID for cache purging       | Cache invalidation  |
| `CLOUDFLARE_API_TOKEN`               | Cloudflare API token (Zone.Cache Purge)    | Cache invalidation  |
| `SENTRY_AUTH_TOKEN`                  | Sentry auth token for source map uploads   | Better error traces |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS`       | Google Analytics measurement ID            | Analytics           |
| `NEXT_PUBLIC_GOOGLE_ADS`             | Google Ads conversion tracking ID          | Ads tracking        |
| `NEXT_PUBLIC_GOOGLE_MAPS`            | Google Maps API key (client-side)          | Maps integration    |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console verification meta tag | SEO verification    |
| `REDIS_URL`                          | Redis connection URL for shared cache      | Multi-instance cache |

### Coolify Deployment (Docker)

For containerized deployments (Coolify), use the provided `Dockerfile` and set:

- Build Pack: `Dockerfile`
- Exposed Port: `3000`
- Required runtime env vars: `NEXT_PUBLIC_API_URL`, `HMAC_SECRET`, `REVALIDATE_SECRET`, `DEEPL_API_KEY`, `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional: `REDIS_URL` for shared cache in multi-instance setups (set before build)

### Coolify Auto-Deploy (GitHub App)

Use the Coolify GitHub App for automatic production deploys on `main`:

1. Install the Coolify GitHub App for this repo.
2. In Coolify app settings → **Advanced** → enable **Auto Deploy**.
3. Ensure the deploy branch is set to `main`.

This is the recommended approach in Coolify’s docs.

### Cloudflare Cache Guidelines

- Cache static assets aggressively (`/_next/static/*`, `/static/*`) with long TTL.
- Respect app-provided HTML caching headers (short `s-maxage` + `stale-while-revalidate`).
- Keep `/api/*` dynamic; rely on cache headers from the app.

### Infrastructure Secrets (Optional)

These are read by `sst.config.ts` at deploy time but have defaults:

| Secret Name          | Description                          | Default Behavior                             |
| -------------------- | ------------------------------------ | -------------------------------------------- |
| `ACM_CERTIFICATE_ARN` | SSL certificate ARN                  | Fetched from SSM Parameter Store             |
| `ALARM_EMAIL`        | Email for CloudWatch alarm alerts    | Defaults to `esdeveniments.catalunya.cat@gmail.com` |
| `SENTRY_LAYER_ARN`   | Sentry Lambda layer ARN              | Defaults to eu-west-3 version 283            |

### AWS SSM Parameter Store

Some configuration is stored in AWS Systems Manager Parameter Store:

- **Parameter:** `/esdeveniments-frontend/acm-certificate-arn`
- **Type:** String
- **Value:** ARN of the ACM certificate for `*.esdeveniments.cat`

**Note:** If this parameter doesn't exist, `sst.config.ts` will fall back to `ACM_CERTIFICATE_ARN` environment variable.

---

## 📚 Key Contacts / Links

- **AWS Console:** `eu-west-3` (Paris)
- **SST Docs:** [sst.dev](https://sst.dev)
- **Cloudflare:** [dash.cloudflare.com](https://dash.cloudflare.com)
- **GitHub Actions:** `.github/workflows/deploy-sst.yml`
