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
- **Memory (`2048 MB`):** We over-provision memory to get **2 vCPUs**, making rendering 2x faster.
- **Architecture (`arm64`):** Uses AWS Graviton processors (cheaper & faster).

---

## 🛠️ Development & Deployment

### Environment Variables

SST does **not** automatically load `.env.production`.

- **Local Dev:** Uses `.env.local`
- **Deployment:** You **must** have a `.env` file present in the root during deploy.

  ```bash
  # Copy production envs before deploying
  cp .env.production .env
  ```

### Deploying to Production

#### Automatic Deployment (Recommended)

**Automatic deployment is configured via GitHub Actions.** When you push or merge to `main`, the workflow (`.github/workflows/deploy-sst.yml`) will automatically:

1. Run tests and build
2. Deploy to AWS using SST
3. Update CloudFront and Lambda

**No manual steps required!** Just push to `main` and it deploys automatically.

#### Manual Deployment

For manual deployments (local or CI):

```bash
# Copy production envs before deploying
cp .env.production .env

# Deploy
npx sst deploy --stage production
```

_This builds the Next.js app, packages it, creates the CloudFormation stack, and updates the Lambda/CloudFront._

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

---

## 🚑 Troubleshooting

| Problem                  | Cause              | Fix                                                                                               |
| :----------------------- | :----------------- | :------------------------------------------------------------------------------------------------ |
| **Images 403 Forbidden** | Lambda Permissions | Go to AWS Lambda -> `ImageOptimizer` -> Add Permission `InvokeFunctionUrl` for Principal `*`.     |
| **Site "Looping"**       | CloudFront Origin  | Ensure Cloudflare points to the **CloudFront URL** (`d123...cloudfront.net`), NOT the Lambda URL. |
| **Slow Initial Load**    | Cold Start         | Check `sst.config.ts` has `warm: 5`. Check AWS Lambda "Provisioned Concurrency" metrics.          |
| **Env Vars Missing**     | Build Process      | Did you deploy without `.env`? Re-run `npx sst deploy`.                                           |

---

## 🔐 GitHub Secrets Setup (for CI/CD)

For automatic deployment to work, you need to configure these secrets in GitHub:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret Name                    | Description                                           | Required    |
| ------------------------------ | ----------------------------------------------------- | ----------- |
| `AWS_ACCESS_KEY_ID`            | AWS IAM user access key                               | ✅ Yes      |
| `AWS_SECRET_ACCESS_KEY`        | AWS IAM user secret key                               | ✅ Yes      |
| `HMAC_SECRET`                  | Server-side HMAC secret for API signing               | ✅ Yes      |
| `NEXT_PUBLIC_API_URL`          | API URL (defaults to `https://api.esdeveniments.cat`) | ⚠️ Optional |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS` | Google Analytics ID                                   | ⚠️ Optional |
| `NEXT_PUBLIC_GOOGLE_ADS`       | Google Ads ID                                         | ⚠️ Optional |
| `SENTRY_DSN`                   | Sentry DSN for error tracking                         | ⚠️ Optional |

**Note:** The ACM certificate ARN is automatically fetched from SSM Parameter Store, so no secret needed for that.

---

## 📚 Key Contacts / Links

- **AWS Console:** `eu-west-3` (Paris)
- **SST Docs:** [sst.dev](https://sst.dev)
- **Cloudflare:** [dash.cloudflare.com](https://dash.cloudflare.com)
- **GitHub Actions:** `.github/workflows/deploy-sst.yml`
