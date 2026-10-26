# Type Definitions

This directory contains all TypeScript type definitions for the project. Types are organized by domain and follow strict rules to prevent duplication.

## Organization

### `types/common.ts`

- **Purpose**: Shared types used across multiple domains
- **Contains**:
  - UI component props (`NavigationItem`, `SocialLinks`, `CardProps`, etc.)
  - Utility types (`Option`, `PlaceType`, `Href`, etc.)
  - SEO types (`BreadcrumbItem`, `WebPageOptions`, `CollectionPageOptions`)
  - Image and performance types (`QualityOptions`, `ImagePerformanceMetrics`, etc.)

### `types/api/*.ts`

- **Purpose**: Backend API response types (DTOs)
- **Contains**:
  - `types/api/event.ts`: Event-related DTOs
  - `types/api/category.ts`: Category DTOs
  - `types/api/city.ts`: City DTOs (canonical `CitySummaryResponseDTO`)
  - `types/api/region.ts`: Region DTOs
  - `types/api/place.ts`: Place DTOs
  - `types/api/news.ts`: News DTOs

### `types/event.ts`

- **Purpose**: Event-specific types and form schemas
- **Contains**: Event form types, validation schemas, and event-related utilities

### `types/filters.ts`

- **Purpose**: URL filtering and filter configuration types
- **Contains**: Filter state, configuration, and error boundary types

### `types/publish-draft.ts`

- **Purpose**: Device-local, create-only publish drafts
- **Contains**: Partial canonical form input, guest/account scope, revision tokens and explicit storage outcomes
- `loadPublishDraft(owner)` returns an owner-scoped snapshot and a database-wide revision token.
- Pass that token to `savePublishDraft(owner, input, revision)` or `discardPublishDraft(owner, revision)`. Await completion before navigation. Save is the flush operation; it has no debounce.
- After a successful mutation, use its returned revision. A stale result requires reloading and resolving the conflict, not an automatic retry over newer work. Mutations in another owner's slot also invalidate the token.
- Discard advances the persistent revision fence even if no payload exists. No per-account tombstones accumulate.
- The fence has its own version, separate from the draft format. Bad metadata, or missing metadata while payloads exist, returns a failure with `revision: null` without deleting payloads. A fresh empty database loads as empty and accepts its first save with `null`. An explicit `discardPublishDraft(owner, null)` repairs a bad fence and discards only that owner's payload in one transaction. Other owners' drafts survive; old UUID and null tokens become stale. Do not retry save automatically after this failure.
- Storage policy: five owner-scoped drafts, 64 KiB of UTF-8 JSON form data each, the existing 2 MiB processed-image limit, and seven days since the last save. Reads do not extend expiry. Reads and writes remove expired payloads; browser eviction may happen sooner.
- A backward device-clock correction of up to five minutes does not invalidate a saved draft or change its timestamp. Larger future timestamps return a recoverable corrupt-record outcome.
- Owner IDs only prevent accidental account mixing, not access by another person using the same browser profile. No guest-to-account adoption is implicit.
- Storage is independent of the create-page integration. `usePublishDraft` adds a 600 ms autosave debounce, explicit restore/discard, accessible status and an awaited `flush()` result for #527. It is not used by the shared EventForm or edit page.
- Each resolved guest or account editor owns a `PublishDraftSession`. Lookup and restore decisions block initial saves. The session serializes writes, cancels pending work before discard and does not retry stale revisions. Initial auth hydration preserves edits until the owner resolves. If the route unmounts first, a document-local buffer retains fields/File until the editor returns; it warns before document unload and never guesses an owner or writes into another saved draft. Later account switches reset the editor; an in-document guest-to-account change blocks saves/publication until reload rather than silently adopting guest fields.
- SPA unmount flushes pending edits before disposing the session. Dirty conflict decisions keep fields focusable for copying, but do not save or publish until resolved. Restore and discard remount the create editor to invalidate pending image preparation.
- Confirmed creation stops autosave and attempts local cleanup before the existing success navigation. Cleanup failure shows a separate browser alert; it never retries creation. Validation, auth/profile rejection and network failures keep the draft.
- `prepareResume(stage)` flushes pending fields/File before login or profile navigation. Failed IndexedDB or sessionStorage writes keep the editor open. A one-use, versioned sessionStorage intent contains only owner/revision, stage and timestamp, expires after one hour and never grants authorization. The safe localized return URL contains only `resume=1`.
- Authenticated returns consume the intent and restore only a matching saved revision into preview, never creation. A later manual visit uses ordinary Restore/Discard. Incomplete profiles keep the editor and preview; their shared publication action saves before the existing profile-save/refetch flow. An account mismatch never reads the previous account's fields.
- A deliberate guest intent may atomically move its exact unexpired snapshot into an empty account slot. An existing account draft requires an explicit choice: keep the account draft or replace it with the guest draft. Both remain unchanged until that choice; replacement uses the same revision fence and rejects competing writes. The choice survives a reload for the intent's remaining lifetime. Ordinary lookup never adopts a guest. Guests can edit and preview; publication prompts sign-in, and optional early sign-in can start that flow before publishing. Form and preview share the same auth policy, including a neutral disabled action while auth resolves.
- The handoff transaction reclaims an expired account slot without advancing a separate expiry fence. An unreadable account record stays untouched until explicit, revision-fenced guest replacement. Failed transactions retain the guest intent and actual error for Retry; stale or expired intents clear their return markers. If a read fails after a committed handoff, recovery uses the account slot without moving the guest again.
- Native-browser module proof (no application/auth UI): `yarn test:e2e e2e/publish-draft-storage.spec.ts --config playwright.remote.config.ts --workers=1`. The test serves the actual bundled module on an intercepted localhost fixture and uses real IndexedDB, File and image decoding across reloads and tabs.

### `types/url-filters.ts`

- **Purpose**: URL parsing and routing types
- **Contains**: URL segments, query parameters, and filter state types

### `types/schema.ts`

- **Purpose**: Schema.org structured data types
- **Contains**: JSON-LD schema types for SEO

## Rules

1. **No duplication**: Each type should be defined exactly once
2. **Domain separation**: API types in `types/api/`, UI types in `types/common.ts`
3. **Canonical sources**:
   - `CitySummaryResponseDTO` → `types/api/city.ts`
   - `NavigationItem` → `types/common.ts`
   - `SocialLinks` → `types/common.ts`
4. **Import from canonical sources**: Always import from the canonical location
5. **No types outside `/types`**: ESLint enforces this rule

## Linting Rules

The project includes ESLint rules that:

- Prevent type/interface declarations outside `/types/`
- Prevent duplicate interface definitions for common types
- Enforce unused variable detection in type files

## Migration Guide

When consolidating duplicate types:

1. Identify the canonical source (usually the most complete definition)
2. Move shared types to `types/common.ts`
3. Update all imports to use the canonical source
4. Remove duplicate definitions
5. Run `yarn typecheck` and `yarn lint` to verify

## Common Patterns

### API DTOs

```typescript
// ✅ Correct: Single canonical definition
export interface CitySummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
  // ... other properties
}

// ❌ Wrong: Duplicate definition
export interface CitySummaryResponseDTO {
  /* duplicate */
}
```

### UI Props

```typescript
// ✅ Correct: In types/common.ts for shared usage
export interface NavigationItem {
  name: string;
  href?: Href;
  url?: string;
  current?: boolean;
}

// ❌ Wrong: Duplicate in multiple files
```

### Form Types

```typescript
// ✅ Correct: Domain-specific in types/event.ts
export interface FormData {
  title: string;
  description: string;
  // ... event-specific properties
}
```
