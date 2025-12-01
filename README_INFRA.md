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

- **Warm Instances (`warm: 2`):** Keeps 2 server instances awake 24/7 to prevent "Cold Starts."
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

---

## 🚑 Troubleshooting

| Problem                  | Cause              | Fix                                                                                               |
| :----------------------- | :----------------- | :------------------------------------------------------------------------------------------------ |
| **Images 403 Forbidden** | Lambda Permissions | Go to AWS Lambda -> `ImageOptimizer` -> Add Permission `InvokeFunctionUrl` for Principal `*`.     |
| **Site "Looping"**       | CloudFront Origin  | Ensure Cloudflare points to the **CloudFront URL** (`d123...cloudfront.net`), NOT the Lambda URL. |
| **Slow Initial Load**    | Cold Start         | Check `sst.config.ts` has `warm: 2`. Check AWS Lambda "Provisioned Concurrency" metrics.          |
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
