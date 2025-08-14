## Performance Improvements: Events Lists, Categories Lists, and Event Detail

This document captures exactly what changed, what is still missing, and the precise next steps to finalize the performance PR. It follows `.github/copilot-instructions.md` (server-first, hybrid rendering contract, caching, strict TS, and SEO/CSP constraints).

---

## What we changed (implemented)

- **Page-by-page pagination (SWR Infinite)**
  - File: `components/hooks/useEvents.ts`
  - Switched from cumulative “increase size on page 0” to page-by-page fetching via `useSWRInfinite`.
  - Preserved SSR-to-client contract: we still accept SSR `fallbackData` as page 0; client pages load incrementally only after user interaction.
  - SWR tuning to reduce revalidation noise: `revalidateOnFocus=false`, dedupe intervals increased, no auto-refresh.
  - Result: reduces bandwidth and CPU by not re-downloading earlier pages; keeps page responsive for long sessions.

- **Virtualized long event lists**
  - File: `components/ui/list/index.tsx`
  - Introduced `@tanstack/react-virtual` to window-virtualize the list when length > 24.
  - Key details:
    - Falls back to simple `.map` rendering when 24 or fewer items (zero behavior change for small lists).
    - Uses the window scroll (no nested scrollbars); overscan = 6; estimated row height = 360px.
    - API unchanged: consumers pass `events` and a `children(event, index)` renderer.
  - Result: greatly reduces DOM nodes and paint/scroll work for large lists.

- **Removed brittle manual image preloading**
  - File: `components/ui/hybridEventsList/index.tsx`
  - Removed `preloadImages` useEffect (which relied on constructing internal `/_next/image` URLs).
  - Rely on `next/image` with `priority` for LCP and existing `utils/image-quality` sizing.
  - Result: less coupling to Next internals; still strong LCP via proper Next/Image usage.

- **Dependency addition**
  - File: `package.json`
  - Added `@tanstack/react-virtual` to `dependencies`.
  - Note: lockfile not updated yet (see Missing section below).

---

## Why these changes (alignment with repo guidelines)

- **Server-first + Hybrid contract** (see `.github/copilot-instructions.md` §6 and §16)
  - SSR still sends the first list with ads inserted once server-side.
  - Client appends only real events beyond SSR count and never inserts ads.
  - We still de-duplicate by `id` across SSR+client boundary.

- **Caching and fetch stability** (see §4)
  - Kept existing `fetchEvents` revalidation windows and fallback behavior.
  - Page-by-page pagination reduces re-fetch payloads and improves responsiveness.

- **Image strategy** (see §11)
  - Continue to use context-aware sizes/qualities via `utils/image-quality.ts`.
  - Avoid non-official `_next/image` URL construction.

- **Strict TypeScript + conventions** (see §7, §13)
  - No `any` added.
  - Types remain in `types/`.

---

## What is still missing (to complete the PR)

- **Install/lock dependencies**
  - `@tanstack/react-virtual` is added in `package.json` but `yarn.lock` hasn’t been updated yet.

- **Type, lint, and tests**
  - Validate the changes didn’t introduce regressions:
    - Type check (strict TS)
    - ESLint
    - Unit tests
    - E2E tests (Playwright)

- **Virtualization polish**
  - Switch to `useWindowVirtualizer` (from `@tanstack/react-virtual`) for first-class window scrolling instead of `document.scrollingElement`.
  - Use `measureElement` (dynamic sizing) so virtualization adapts to real card heights (ads + cards can vary). Current estimate is 360px.

- **Contract verification**
  - Reconfirm `serverHasMore` is computed correctly on pages where ads are mixed into SSR arrays.
  - Ensure no ad duplication and stable density across SSR + client append.

- **Tests that depend on list length**
  - Any tests asserting rendered DOM count for long lists may need to account for virtualization (only visible rows are in the DOM).

---

## Exact next steps (copy/paste runnable when you’re ready)

Do not run these now; they are here so you can continue later without assumptions.

### 1) Install dependencies and update lockfile

```bash
# From repository root
corepack enable
yarn install --mode=update-lockfile
```

### 2) Typecheck and lint

```bash
yarn typecheck
yarn lint
```

### 3) Run tests

```bash
yarn test
# (Optional, if time permits)
yarn test:e2e
```

### 4) Virtualization improvements (recommended)

- File: `components/ui/list/index.tsx`
  1) Replace the current virtualizer with `useWindowVirtualizer`:

```ts
// import { useVirtualizer } from "@tanstack/react-virtual";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useWindowVirtualizer({
  count: events?.length || 0,
  estimateSize: () => 360,
  overscan: 6,
  enabled: shouldVirtualize,
});
```

  2) Add dynamic measurement to reduce scroll jumps:

```ts
// Pass a measureElement function so rows can self-measure when rendered
const rowVirtualizer = useWindowVirtualizer({
  count: events?.length || 0,
  estimateSize: () => 360,
  overscan: 6,
  enabled: shouldVirtualize,
  measureElement: (el) => el.getBoundingClientRect().height,
});
```

  3) Ensure each row’s outer wrapper is referenceable (no layout-affecting wrappers above it).

### 5) Validate hybrid rendering contract

- Pages to verify:
  - `app/[place]/page.tsx`
  - `app/[place]/[byDate]/page.tsx`
  - `app/[place]/[byDate]/[category]/page.tsx`
- Checklist:
  - **SSR includes ads only once**: server uses `insertAds` and sends SSR list with ads.
  - **Client appends only real events**: client computes `initialRealCount` from SSR (excluding ads) and appends from that offset.
  - **No duplication**: ensure `id`-based de-duplication remains effective.
  - **`serverHasMore`**: confirm it is computed from the raw server response (not from the ad-inflated array).

### 6) Re-run tests after any virtualization changes

```bash
yarn typecheck
yarn lint
yarn test
# Optionally, e2e UI
# yarn test:e2e:ui
```

### 7) Optional, low-risk follow-ups (can be separate PRs)

- **Event detail hydration trim**:
  - Move purely static parts from `app/e/[eventId]/EventClient.tsx` into the server page component to reduce client hydration (keep only truly interactive pieces as client components).
- **Weather icon**: ensure it’s not marked as `priority` (it isn’t now), avoiding unnecessary resource prioritization for small assets.
- **Lighthouse/Bundle analysis**:
  - `yarn analyze` or Lighthouse on large lists and event detail; record LCP/CLS/transfer-size improvements.

---

## Files changed in this PR (already edited)

- `components/hooks/useEvents.ts`
  - Refactor to `useSWRInfinite` with server-first fallback and reduced revalidation noise.
- `components/ui/list/index.tsx`
  - Virtualization for lists > 24 items with `@tanstack/react-virtual`.
- `components/ui/hybridEventsList/index.tsx`
  - Removed manual image preloading; rely on Next/Image.
- `package.json`
  - Added dependency `@tanstack/react-virtual`.

No changes to data DTOs, API shapes, or cache TTLs.

---

## QA checklist (manual)

- **Home (`/`)**: Categorized sections render correctly; JSON-LD limited; no layout thrash.
- **Place list (`/[place]`)**: SSR with ads + client append; Load More works; scroll smoothness maintained with virtualization.
- **Place+date lists**: Same as above; verify canonical redirects still happen as before.
- **Place+date+category lists**: Same checks; verify `serverHasMore` and ad placement.
- **Event detail (`/e/[eventId]`)**: No hydration errors; media (video/image) selection unchanged; related events section OK.
- **CSP/Nonce**: No new inline scripts introduced; JSON-LD still uses `nonce`.

---

## Rollback plan

- **Virtualization off**: In `components/ui/list/index.tsx`, return to the simple `.map` path (keep code branch, set threshold to a very large number or temporarily remove the virtualizer path).
- **Pagination back**: In `components/hooks/useEvents.ts`, revert to single-page 0 with increasing size. Not recommended, but feasible.
- **Image preload**: No need to re-introduce; Next/Image handles priority well.

---

## References

- Project rules: `.github/copilot-instructions.md` (re-read §§ 2, 3, 4, 6, 7, 8, 13, 15, 16 for any further changes).
- Image perf rules: `utils/image-quality.ts` and `components/ui/common/image/*`.

---

If anything in this doc diverges from `.github/copilot-instructions.md`, align with that file as the source of truth.