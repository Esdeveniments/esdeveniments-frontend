# Migration Verification & Improvement Plan

---

## <CURRENT_STATE>

### 1. Detailed Breakdown of Existing Architecture
- The project currently uses the `pages/` router (with `pages/`, `getStaticProps`, `getServerSideProps`, API routes, etc.).
- Data fetching is performed using legacy methods (`getStaticProps`, `getServerSideProps`, `getInitialProps`, `getStaticPaths`).
- Custom logic exists in `_app.tsx` and possibly `_document.tsx`.
- API routes are implemented under `pages/api/*`.
- Static assets are under `public/`.
- Components may use both client and server logic.
- The new structure should use `/app`, with nested folders for each route, and new conventions for layouts, server/client components, and route handlers.

### 2. List of Files Requiring Modification
- `pages/` directory and all its contents (especially files with data fetching or API logic).
- `pages/_app.tsx` → migrate logic to `app/layout.tsx`
- `pages/_document.tsx` → migrate `<Head>` to `app/head.tsx` or `metadata`
- All files using `getStaticProps`, `getServerSideProps`, or `getInitialProps`
- All API route files: `pages/api/*` → `app/api/*/route.ts`
- Any component using client-side logic (must add `'use client'`)
- `next.config.js` (to enable `appDir`)
- `package.json` (for dependency updates)

### 3. Current Routing and Data Fetching Patterns
- File-based routing in `pages/`
- Dynamic routes via `[param]` folders/files
- Data fetching via `getStaticProps`, `getServerSideProps`
- API endpoints under `pages/api`
- Possible use of custom `_app.tsx` and `_document.tsx`
- No mention of middleware, but needs verification

## Project Structure to Refactor

### Current `pages/` Directory

```
pages/
  404.tsx
  _app.tsx
  _document.tsx
  _error.tsx
  index.tsx
  publica.tsx
  qui-som.tsx
  rss.xml.ts
  [place]/
    index.tsx
    [byDate]/
      index.tsx
  e/
    [eventId]/
      index.tsx
      edita/
        index.tsx
        old.index.js
        types.ts
      types.ts
  server-sitemap.xml/
    index.tsx
  sitemap/
    index.tsx
    [town]/
      index.tsx
      [year]/
        index.tsx
        [month]/
          index.tsx
```

### Files and Folders Requiring Migration

- All the above files and directories, including:
  - Dynamic routes: `[place]`, `[byDate]`, `[eventId]`, `[town]`, `[year]`, `[month]`
  - Special files: `_app.tsx`, `_document.tsx`, `_error.tsx`, `404.tsx`
  - API or special endpoints: `rss.xml.ts`, `server-sitemap.xml/`
  - Static pages: `index.tsx`, `publica.tsx`, `qui-som.tsx`
  - All nested files (e.g., `edita/`, `types.ts`)

### Files Using Legacy Data Fetching Methods

- **pages/index.tsx**
  - `getStaticProps`

- **pages/rss.xml.ts**
  - `getServerSideProps`

- **pages/e/[eventId]/edita/old.index.js**
  - `getServerSideProps`

- **pages/_document.tsx**
  - `getInitialProps`

- **pages/e/[eventId]/index.tsx**
  - `getStaticPaths`
  - `getStaticProps`

- **pages/server-sitemap.xml/index.tsx**
  - `getServerSideProps`

- **pages/e/[eventId]/edita/index.tsx**
  - `getServerSideProps`

- **pages/_error.tsx**
  - `getInitialProps` (custom error handling)

- **pages/[place]/[byDate]/index.tsx**
  - `getStaticPaths`
  - `getStaticProps`

- **pages/sitemap/index.tsx**
  - `getStaticProps`

- **pages/sitemap/[town]/[year]/[month]/index.tsx**
  - `getStaticPaths`
  - `getStaticProps`

- **pages/sitemap/[town]/index.tsx**
  - `getStaticPaths`
  - `getStaticProps`

- **pages/[place]/index.tsx**
  - `getStaticPaths`
  - `getStaticProps`

### Recommended Migration Approach by File

| File Path                                               | Legacy Methods Used              | Recommended Migration Approach                              |
|---------------------------------------------------------|----------------------------------|-------------------------------------------------------------|
| **pages/index.tsx**                                     | `getStaticProps`                 | Move to `app/page.tsx` as a Server Component. Use `fetch` for data fetching. |
| **pages/rss.xml.ts**                                    | `getServerSideProps`             | Move to `app/rss.xml/route.ts` as a Route Handler (export GET). |
| **pages/e/[eventId]/edita/old.index.js**                | `getServerSideProps`             | Move to `app/e/[eventId]/edita/route.ts` as a Route Handler (export GET/POST as needed). |
| **pages/_document.tsx**                                 | `getInitialProps`                | Migrate head logic to `app/head.tsx` or use `metadata` export. Remove legacy method. |
| **pages/e/[eventId]/index.tsx**                         | `getStaticPaths`, `getStaticProps` | Move to `app/e/[eventId]/page.tsx` as a Server Component. Use dynamic segment and `fetch`. |
| **pages/server-sitemap.xml/index.tsx**                  | `getServerSideProps`             | Move to `app/server-sitemap.xml/route.ts` as a Route Handler (export GET). |
| **pages/e/[eventId]/edita/index.tsx**                   | `getServerSideProps`             | Move to `app/e/[eventId]/edita/page.tsx` as a Server Component if UI, or Route Handler if API/data only. |
| **pages/_error.tsx**                                    | `getInitialProps` (custom error) | Use `app/[...]/error.tsx` for error boundaries. Remove legacy method. |
| **pages/[place]/[byDate]/index.tsx**                    | `getStaticPaths`, `getStaticProps` | Move to `app/[place]/[byDate]/page.tsx` as a Server Component. Use dynamic segments and `fetch`. |
| **pages/sitemap/index.tsx**                             | `getStaticProps`                 | Move to `app/sitemap/page.tsx` as a Server Component. Use `fetch` for data. |
| **pages/sitemap/[town]/[year]/[month]/index.tsx**       | `getStaticPaths`, `getStaticProps` | Move to `app/sitemap/[town]/[year]/[month]/page.tsx` as a Server Component. Use dynamic segments and `fetch`. |
| **pages/sitemap/[town]/index.tsx**                      | `getStaticPaths`, `getStaticProps` | Move to `app/sitemap/[town]/page.tsx` as a Server Component. Use dynamic segments and `fetch`. |
| **pages/[place]/index.tsx**                             | `getStaticPaths`, `getStaticProps` | Move to `app/[place]/page.tsx` as a Server Component. Use dynamic segment and `fetch`. |

**Legend / Guidance:**
- **Server Component:** Use for pages rendering UI and fetching data. Use async functions and `fetch` directly.
- **Route Handler:** Use for endpoints (API/data, XML, etc.). Export `GET`/`POST` functions as needed.
- **Dynamic Segment:** Use `[param]` in folder/file names for dynamic routes.
- **Error Handling:** Use `error.tsx` in the relevant `app/` subfolder for error boundaries.
- **Head/Metadata:** Use `head.tsx` or `metadata` export in `layout.tsx` or `page.tsx`.

---

## Additional Critical Migration Aspects

### 1. Authentication Migration
- **Inventory all authentication solutions** (e.g., NextAuth.js, custom JWT, session cookies).
- **Update usage:**
  - Move authentication providers/wrappers to `app/layout.tsx` or nested layouts as needed.
  - For API authentication logic, migrate to new Route Handlers (`app/api/*/route.ts`).
  - Update usage of cookies, headers, and sessions to use the new `next/headers` API.
- **Testing:** Ensure login/logout, protected routes, and session persistence work as expected.
- **References:**
  - [Next.js Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)

### 2. State Management Adaptation
- **Inventory all state management libraries** (Redux, Zustand, Context, etc.).
- **Migration:**
  - Move providers to `app/layout.tsx` or appropriate nested layouts.
  - Ensure client state is only used in Client Components (`'use client'`).
  - For SSR/SSG hydration, use `useEffect` to rehydrate state as needed.
- **Testing:** Confirm state is preserved across navigation, SSR, and hydration.

### 3. CSS/SCSS and Asset Migration
- **Inventory all global/local CSS, SCSS, CSS modules, and third-party frameworks (e.g., Tailwind, Bootstrap).**
- **Migration:**
  - Import global styles in `app/layout.tsx` only.
  - For CSS modules and SCSS, ensure import paths are updated.
  - For third-party frameworks, follow their Next.js App Router integration guides.
- **Testing:** Validate all styles render correctly in dev and production.
- **References:**
  - [Next.js Styling](https://nextjs.org/docs/app/building-your-application/styling)

### 4. Image Component Updates
- **Update all usages of `<Image />` to match the latest Next.js API.**
- **Migration:**
  - Update import paths and props.
  - Review and update `next.config.js` for domains, loaders, and remote patterns.
- **Testing:** Ensure all images render, optimize, and lazy-load as expected.
- **References:**
  - [Next.js Image Component](https://nextjs.org/docs/app/building-your-application/optimizing/images)

### 5. Dynamic Routes: Advanced Patterns
- **Inventory all catch-all and optional catch-all routes (`[...param]`, `[[...param]]`).**
- **Migration:**
  - Use the same folder/file naming in `/app`.
  - Update data fetching and error handling logic for dynamic segments.
- **Testing:** Ensure all dynamic routes resolve and fallback correctly.

### 6. API Routes, Middleware, and Edge Functions
- **Inventory all API routes, middleware, and edge functions.**
- **Migration:**
  - Move API logic to `app/api/*/route.ts`.
  - Update handler signatures to use the new Request/Response API (`Request`, `Response`).
  - For middleware, migrate to `middleware.ts` in the root or relevant subfolders.
  - For edge functions, use the new edge runtime configuration.
- **Testing:** Validate all endpoints, middleware, and edge logic in dev and prod.
- **References:**
  - [Next.js API Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
  - [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### 7. Environment Variables
- **Inventory all `.env`, `.env.local`, and usage of `process.env`.**
- **Migration:**
  - Update usage to match new conventions (`NEXT_PUBLIC_` for client, others for server).
  - Validate all environment variables are loaded and accessible in the new structure.
- **Testing:** Confirm all environment-dependent features work in dev and prod.
- **References:**
  - [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### 8. TypeScript Configuration
- **Update `tsconfig.json` for App Router compatibility.**
- **Migration:**
  - Ensure `app/` is included in `include` paths.
  - Update type definitions for new server/client components and API handlers.
  - Add/adjust types for new data fetching and streaming APIs.
- **Testing:** Run `tsc --noEmit` to catch type errors.
- **References:**
  - [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)

### 9. Testing Setup Modifications
- **Inventory all test frameworks (Jest, Cypress, Playwright, etc.).**
- **Migration:**
  - Update test setup to support `/app` directory and new component patterns.
  - Add/adjust tests for server/client components, route handlers, and API endpoints.
  - Update mocks and utilities for new data fetching and streaming APIs.
- **Testing:** Ensure all tests pass pre- and post-migration.
- **References:**
  - [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

### 10. Development Workflow, Build, and Deployment
- **Update all dev scripts and build/deploy configs.**
- **Migration:**
  - Update `package.json` scripts for new build/dev commands.
  - Review and update CI/CD pipelines for `/app` structure.
  - Validate deployment targets (Vercel, Netlify, custom) support App Router features.
- **Testing:** Deploy to staging and production, validate all routes and APIs.
- **References:**
  - [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)

### 11. Performance Monitoring and Error Reporting
- **Integrate or update performance monitoring tools (e.g., Vercel Analytics, Sentry, LogRocket).**
- **Migration:**
  - Add monitoring to new server/client components and API routes.
  - Update error boundaries to log/report errors.
- **Testing:** Confirm metrics and error logs are accurate post-migration.

### 12. SEO and Metadata Enhancements
- **Inventory all SEO, Open Graph, and canonical tags.**
- **Migration:**
  - Use the new `metadata` export in `layout.tsx`/`page.tsx` for SEO tags.
  - Update dynamic metadata for dynamic routes.
  - Validate structured data and Open Graph tags render correctly.
- **Testing:** Use Lighthouse/SEO tools to verify.
- **References:**
  - [Next.js SEO](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

### 13. Cache Strategies and Revalidation
- **Update all data fetching to use the new cache and revalidate options.**
- **Migration:**
  - Use `fetch(url, { next: { revalidate: X } })` for ISR.
  - Use `no-store` for SSR-only data.
  - Validate cache headers and revalidation logic in production.
- **References:**
  - [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)

### 14. Fallback/Error Handling and Rollback
- **Add explicit fallback and error handling strategies.**
- **Migration:**
  - Use `loading.tsx`, `error.tsx`, and `not-found.tsx` for all critical routes.
  - Add runtime checks and monitoring for migration-related errors.
  - Maintain a rollback branch and plan for critical production issues.

---

## Updated Verification Checklist

### Pre-migration Safety Checks
- [ ] Audit all authentication, state management, environment variable, and asset usage.
- [ ] Inventory all CSS/SCSS, images, and third-party assets.
- [ ] List all test coverage and ensure baseline.
- [ ] Validate all dev/build/deploy scripts for compatibility.
- [ ] Ensure monitoring, SEO, and cache strategies are documented.

### Implementation Validation Points
- [ ] Authentication and state management work as expected.
- [ ] All styles, images, and assets load correctly.
- [ ] Environment variables are available in server/client as needed.
- [ ] TypeScript types and config are valid.
- [ ] Tests pass for all migrated components and APIs.
- [ ] Dev workflow, build, and deployment succeed without errors.
- [ ] Monitoring, SEO, and cache strategies are effective post-migration.
- [ ] Fallbacks and error boundaries are present and functional.

### Post-migration Verification Steps
- [ ] All routes, APIs, and assets function in staging and production.
- [ ] No critical errors in logs or monitoring tools.
- [ ] Performance and SEO metrics meet or exceed pre-migration baselines.
- [ ] Rollback plan is tested and available.

---

## Example: Authentication Provider Migration
```tsx
// app/layout.tsx
import { AuthProvider } from '../providers/AuthProvider';
export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

## Example: Environment Variable Usage
```ts
// Server-only
const secret = process.env.SECRET_KEY;
// Client-accessible
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## Example: TypeScript Config Update
```json
// tsconfig.json
{
  "include": ["app", "pages", "components", "lib", "types"],
  "compilerOptions": {
    "types": ["node", "jest"]
  }
}
```

## Example: API Route Handler (App Router)
```ts
// app/api/events/route.ts
import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  // ...logic
  return NextResponse.json({ data: [] });
}
```

---

## MIGRATION_ANALYSIS

### Step-by-Step Verification of Each Migration Instruction

#### 1. Upgrade & Prep
- **Instruction:** Bump Next.js, React, ReactDOM; enable `appDir` in config.
- **Verification:** Must check `package.json` and `next.config.js`.
- **Gaps:** No explicit check for TypeScript or other dependencies (e.g., ESLint, SWC config).
- **Action:** Verify all dependencies are compatible with Next.js 14+.

#### 2. Directory Structure & Routing
- **Instruction:** Create `/app`, mirror routes, rename files, migrate `_app.tsx` and `_document.tsx`.
- **Verification:** Must map current `pages/` structure and ensure all routes are mirrored.
- **Gaps:** No mention of handling custom error pages or middleware.
- **Action:** List all current routes, dynamic segments, and any middleware.

#### 3. Layouts & Templates
- **Instruction:** Use `layout.tsx`, support nested layouts, add loading/error boundaries.
- **Verification:** Ensure all shared logic is migrated from `_app.tsx` and `_document.tsx`.
- **Gaps:** No explicit mention of moving providers or global CSS.
- **Action:** Identify all providers and global styles.

#### 4. Data Fetching → Server Components & ISR
- **Instruction:** Remove legacy data fetching, use fetch in server components, apply ISR with revalidate.
- **Verification:** List all files using legacy data fetching and plan migration.
- **Gaps:** No mention of fallback or blocking strategies.
- **Action:** Identify all data fetching patterns in use.

#### 5. Mutations → Server Actions
- **Instruction:** Use server actions for mutations.
- **Verification:** Identify all mutation endpoints and forms.
- **Gaps:** No mention of authentication or authorization.
- **Action:** List all forms and mutation logic.

#### 6. Client Components
- **Instruction:** Mark components needing state/effects with `'use client'`.
- **Verification:** Identify all such components.
- **Gaps:** No mention of shared utilities or context.
- **Action:** List all client-side logic.

#### 7. Composition & Partial Rendering
- **Instruction:** Split UI for streaming.
- **Verification:** Identify heavy UI components.
- **Gaps:** No mention of suspense boundaries.
- **Action:** List all candidates for partial rendering.

#### 8. Asset & Head Management
- **Instruction:** Use `metadata` export, migrate `<Head>`.
- **Verification:** Identify all usages of `<Head>`.
- **Gaps:** No mention of favicon, meta tags.
- **Action:** List all head customizations.

#### 9. API Routes → Route Handlers
- **Instruction:** Move API routes to `/app/api/*/route.ts`.
- **Verification:** List all API routes.
- **Gaps:** No mention of middleware or edge functions.
- **Action:** Identify all API endpoints.

#### 10. Testing & QA
- **Instruction:** Run dev server, smoke test, validate ISR, test server actions, check bundle size.
- **Verification:** List all test cases and QA steps.
- **Gaps:** No mention of automated tests.
- **Action:** Identify all manual and automated tests.

### Gaps or Inconsistencies Found
- No explicit mention of middleware, edge functions, or custom error pages.
- No guidance for global CSS, providers, or context migration.
- No mention of TypeScript config, ESLint, or other tooling.
- Lacks detail on migrating authentication/authorization logic.

### Additional Steps Needed
- Audit for middleware and edge functions.
- Audit for global styles and context providers.
- Audit for custom error pages.
- Audit for TypeScript and lint/tooling config.

---

## <UPDATED_PLAN>

### Revised Migration Steps (V4A Diff Format Example)

```diff
@@ next.config.js
+ module.exports = {
+   experimental: { appDir: true },
+ }
```

```diff
@@ package.json
- "next": "^12.x"
+ "next": "^14.x"
- "react": "^17.x"
+ "react": "^18.x"
- "react-dom": "^17.x"
+ "react-dom": "^18.x"
```

```diff
@@ pages/_app.tsx
- // custom app logic
+ // Migrate logic to app/layout.tsx
```

```diff
@@ pages/api/events.ts
- // API route logic
+ // Move to app/api/events/route.ts
```

```diff
@@ pages/events/[id].tsx
- export async function getStaticProps() { ... }
+ // Remove getStaticProps, use fetch in app/events/[id]/page.tsx
```

**Testing Requirements per Modification**
- After each migration, run `yarn dev` and smoke test affected routes.
- For each migrated API route, test endpoint with curl or Postman.
- For each data fetching migration, verify SSR/ISR behavior.
- For each client component, ensure interactivity is preserved.

---

## <VERIFICATION_CHECKLIST>

### Pre-migration Verification Steps
- [ ] List all routes, dynamic segments, API endpoints, and middleware.
- [ ] List all files using legacy data fetching methods.
- [ ] List all providers, global styles, and custom error pages.
- [ ] Ensure all dependencies are compatible with Next.js 14+.

### During-migration Checkpoints
- [ ] next.config.js experimental appDir: true.
- [ ] All pages under /app rendering without SSR errors.
- [ ] tsconfig.json updated for appDir.
- [ ] Client components isolated with 'use client'.
- [ ] API routes use route.ts with GET/POST handlers.
- [ ] Metadata correctly applied via metadata.ts and head.tsx.
- [ ] Image domains and loader options valid.
- [ ] Each route/page is mirrored in `/app` with correct nesting.
- [ ] All data fetching logic is migrated to server components or route handlers.
- [ ] All API endpoints are migrated to `/app/api`.
- [ ] All client components are marked with `'use client'`.
- [ ] All shared providers and styles are moved to `app/layout.tsx`.

### Post-migration Validation Tests
- [ ] All routes render as expected.
- [ ] All API endpoints respond correctly.
- [ ] Data fetching works with SSR/ISR as intended.
- [ ] Server actions and forms work.
- [ ] Bundle size and performance are acceptable.
- [ ] No regressions in Lighthouse or automated tests.

---

## Checklist: Global Styles and Providers Migration

### 1. Identify All Global Styles and Providers
- [ ] List all global CSS files (e.g., `styles/globals.css`, `styles/theme.css`).
- [ ] List all CSS framework imports (e.g., Tailwind, Bootstrap).
- [ ] List all global SCSS/SASS/LESS files.
- [ ] List all context providers (e.g., AuthProvider, ThemeProvider, ReduxProvider) used in `_app.tsx`.
- [ ] Identify any other wrappers or providers (e.g., IntlProvider, QueryClientProvider).

### 2. Move Global CSS Imports to `app/layout.tsx`
- Import all global CSS files at the top of `app/layout.tsx`:
  ```tsx
  // app/layout.tsx
  import '../styles/globals.css';
  import '../styles/theme.css';
  // ...add additional global styles as needed
  ```
- Remove global CSS imports from `_app.tsx` after migration.

### 3. Wrap Providers in `app/layout.tsx` or Nested Layouts
- Wrap your context providers around the `{children}` prop in `app/layout.tsx`:
  ```tsx
  // app/layout.tsx
  import AuthProvider from '../providers/AuthProvider';
  import ThemeProvider from '../providers/ThemeProvider';

  export default function RootLayout({ children }) {
    return (
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    );
  }
  ```
- For providers that should only apply to certain routes, use a nested layout (e.g., `app/dashboard/layout.tsx`).
- Remove provider logic from `_app.tsx` after migration.

**Note:**
- Providers and global CSS must be imported in a Client Component if they depend on client-side APIs (e.g., context using `useState`/`useEffect`). In that case, add `'use client'` at the top of the layout file.

---

## Migrating Custom Error Pages and Error Boundaries

### Issue
No clear migration plan for custom error pages (`_error.tsx`, `404.tsx`) or error boundaries.

### Solution

1. **Migrate Error Handling to App Router**
   - Replace usage of `pages/_error.tsx` with `app/[...]/error.tsx` in the relevant route segment.
   - For global error boundaries, create `app/error.tsx`.
   - For route-specific error boundaries, create `error.tsx` in the corresponding subfolder (e.g., `app/dashboard/error.tsx`).

   ```tsx
   // app/error.tsx
   export default function GlobalError({ error, reset }) {
     return (
       <html>
         <body>
           <h2>Something went wrong!</h2>
           <pre>{error.message}</pre>
           <button onClick={() => reset()}>Try again</button>
         </body>
       </html>
     );
   }
   ```

2. **Handle 404 Pages (Not Found)**
   - Replace `pages/404.tsx` with `app/not-found.tsx` for a global 404 page.
   - For route-specific 404s, use `not-found.tsx` in the relevant subfolder.

   ```tsx
   // app/not-found.tsx
   export default function NotFound() {
     return <h2>404 - Page Not Found</h2>;
   }
   ```
   - In server components, call the `notFound()` function from `next/navigation` to trigger a 404:
   ```tsx
   import { notFound } from 'next/navigation';
   // ...
   if (!data) notFound();
   ```

3. **Remove Legacy Error Handling**
   - Delete `pages/_error.tsx` and `pages/404.tsx` after migration.
   - Ensure all error and not-found logic is handled in the `app/` directory using the new conventions.

**References:**
- [Next.js: Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Next.js: Not Found Pages](https://nextjs.org/docs/app/building-your-application/routing/not-found)

---

## Migrating Fallback/Blocking Strategies for Data Fetching

### Issue
No guidance on how to migrate fallback/blocking behavior from `getStaticPaths`.

### Solution

1. **Dynamic Routes in the App Router**
   - In the App Router, dynamic routes (e.g., `app/posts/[id]/page.tsx`) do not use `getStaticPaths` or `fallback`/`blocking` options.
   - All dynamic segments are rendered on-demand at request time by default.

2. **Handling Loading States**
   - Use a `loading.tsx` file in the same folder as your dynamic route to display a loading UI while server components or data are being fetched.
   ```tsx
   // app/posts/[id]/loading.tsx
   export default function Loading() {
     return <div>Loading post...</div>;
   }
   ```

3. **Handling Not Found and Errors**
   - Use the `notFound()` function from `next/navigation` to trigger a 404 if the dynamic resource does not exist.
   - Use an `error.tsx` file to catch and display errors during data fetching or rendering.
   ```tsx
   // app/posts/[id]/error.tsx
   export default function Error({ error, reset }) {
     return (
       <div>
         <h2>Something went wrong!</h2>
         <pre>{error.message}</pre>
         <button onClick={() => reset()}>Try again</button>
       </div>
     );
   }
   ```

4. **Conditional Fetch Logic**
   - In your server component, fetch data and conditionally render loading, error, or not-found states as appropriate. Example:
   ```tsx
   // app/posts/[id]/page.tsx
   import { notFound } from 'next/navigation';

   export default async function PostPage({ params }) {
     const post = await fetchPost(params.id);
     if (!post) notFound();
     return <PostDetail post={post} />;
   }
   ```

5. **ISR/SSG Equivalents**
   - If you require Incremental Static Regeneration (ISR), use the `revalidate` option in your fetch call:
   ```tsx
   await fetch(url, { next: { revalidate: 60 } }); // Revalidate every 60 seconds
   ```

**References:**
- [Next.js: Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Next.js: Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)

---

## Migrating API Routes to App Router Route Handlers

### Issue
API route migration is mentioned, but lacks details on differences between old and new request/response objects, and handling of methods.

### Solution

1. **Location and File Naming**
   - Move API routes from `pages/api/` to `app/api/`.
   - Use a `route.ts` (or `route.js`) file for each endpoint (e.g., `app/api/events/route.ts`).

2. **Handler Signature Differences**
   - **Old (`pages/api/*.ts`):**
     ```ts
     // pages/api/hello.ts
     import type { NextApiRequest, NextApiResponse } from 'next';

     export default function handler(req: NextApiRequest, res: NextApiResponse) {
       res.status(200).json({ name: 'John Doe' });
     }
     ```
   - **New (`app/api/*/route.ts`):**
     ```ts
     // app/api/hello/route.ts
     import { NextRequest, NextResponse } from 'next/server';

     export async function GET(request: NextRequest) {
       return NextResponse.json({ name: 'John Doe' });
     }
     ```
   - **Key differences:**
     - Use `NextRequest`/`NextResponse` instead of `NextApiRequest`/`NextApiResponse`.
     - Export HTTP methods (`GET`, `POST`, etc.) as named async functions instead of a default export.

3. **Handling Multiple HTTP Methods**
   - Export each method you want to handle:
     ```ts
     export async function GET(request: NextRequest) { /* ... */ }
     export async function POST(request: NextRequest) { /* ... */ }
     ```

4. **Parsing Request Data**
   - For POST/PUT, use `await request.json()` or `await request.formData()` to read the body.
   - For query params, use `request.nextUrl.searchParams`.

5. **Response Helpers**
   - Use `NextResponse.json(data)` for JSON responses.
   - Use `NextResponse.redirect(url)` for redirects.
   - Set headers/cookies with `NextResponse` methods.

6. **Example: Migrating an API Route**
   ```ts
   // pages/api/events.ts (old)
   export default function handler(req, res) {
     if (req.method === 'POST') {
       // handle POST
     } else {
       // handle GET
     }
   }

   // app/api/events/route.ts (new)
   import { NextRequest, NextResponse } from 'next/server';

   export async function GET(request: NextRequest) {
     // handle GET
     return NextResponse.json({ events: [] });
   }

   export async function POST(request: NextRequest) {
     const body = await request.json();
     // handle POST
     return NextResponse.json({ success: true });
   }
   ```

**References:**
- [Next.js: Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js: API Reference for NextRequest/NextResponse](https://nextjs.org/docs/app/api-reference/next-request)

```
