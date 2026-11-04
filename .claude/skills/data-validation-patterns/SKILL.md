---
name: data-validation-patterns
description: How to validate untrusted data with Zod in esdeveniments.cat - backend API responses, webhook payloads and request bodies - using the parse* helpers in lib/validation/ and safe fallbacks. Use when adding or changing a backend call or DTO, writing a lib/validation schema, parsing a webhook or a route's JSON body, or debugging "invalid payload" logs.
---

# Data validation patterns

Rule (AGENTS.md › API layer): parse every backend response with Zod in the external wrapper, and have reads return a safe fallback instead of throwing. Some older readers still cast raw JSON (`lib/api/news-external.ts`, `fetchCategorizedEventsExternal` in `lib/api/events-external.ts`); don't copy them, and add a parser when you touch them. Where the parse call sits in the three layers: `api-layer-patterns` skill.

## Where schemas live

- Backend DTO schemas and their `parse*` helpers: `lib/validation/<resource>.ts`, one file per resource. Run `ls lib/validation/` to see them all (event, category, city, place, region, user, profile, favorites, promotion, upload, auth, username, publish-draft).
- TypeScript types stay in `types/` (DTOs in `types/api/`). Schemas import the DTO type and the parser returns it; don't declare `z.infer` aliases in `lib/validation/` (ESLint only allows type aliases in `types/`).
- Shared building blocks are exported and reused: `EventSummaryResponseDTOSchema`, `CitySummaryResponseDTOSchema` and `CategorySummaryResponseDTOSchema` live in `lib/validation/event.ts` and are imported by `city.ts` and `category.ts`.
- A request-body schema used by a single route may sit at the top of that route (`ToggleFavoriteSchema` in `app/api/favorites/route.ts`). Move it to `lib/validation/` once a second file needs it (`profileUpdateSchema` in `lib/validation/auth.ts`).

## The parser pattern

Always `safeParse`, log with the function name, return the fallback. From `lib/validation/city.ts`:

```typescript
import { z } from "zod";
import type { CitySummaryResponseDTO } from "types/api/city";
import { CitySummaryResponseDTOSchema } from "./event";

export const CitySummaryArraySchema = z.array(CitySummaryResponseDTOSchema);

export function parseCities(input: unknown): CitySummaryResponseDTO[] {
  const result = CitySummaryArraySchema.safeParse(input);
  if (!result.success) {
    console.error("parseCities: invalid cities payload", result.error.format());
    return [];
  }
  return result.data;
}
```

Fallbacks by shape:

| Shape | Return on failure | Example |
| --- | --- | --- |
| Single object | `null` | `parseEventDetail`, `parseCity`, `parsePlace`, `parseCategoryDetail`, `parseUserPublic` |
| Array | `[]` | `parseCities`, `parseCategories`, `parsePlaces`, `parseRegionsGrouped` |
| Array where one bad item must not drop the rest | valid items only | `parseEventSummaryList` (parses item by item) |
| Paged response | `null`; the caller decides | `parsePagedEvents` → `PagedResponseDTO<EventSummaryResponseDTO> \| null` |

`fetchEventsExternalResult` (`lib/api/events-external.ts`) returns a 502 status on upstream or validation failure; `fetchEventsExternal` unwraps that result and falls back to an empty page.

Parsers may also normalize after validation: `parseEventDetail` and `parsePagedEvents` add image cache keys, `parseRegionsGrouped` fills a missing `slug` from `name`. Keep that logic in the parser so every caller gets the same shape.

## Writing a schema for a backend DTO

- Match what the backend really sends, not what you wish it sent. The backend writes unset fields as explicit `null`, so optional fields are usually `.nullish()`, often with `.transform((v) => v ?? undefined)` to fit an optional DTO field (see `lib/validation/user.ts`).
- Use `.passthrough()` when extra fields must survive (`CategoryDetailResponseDTOSchema`); the parser then needs a cast to the DTO type.
- Sanitize free text that ends up in `<head>` or JSON-LD in the schema (see `sanitizeMetaField` in `lib/validation/event.ts`).
- When the backend changes a field, accept both shapes during the transition rather than failing the whole payload (see the comments on `UserPublicResponseDTOSchema`).

## Webhooks and request bodies

- Parse JSON in a `try/catch`, then `safeParse`. Bad input → `400` with a short error code, never a 500. See `app/api/favorites/route.ts`.
- Stripe: `lib/stripe/webhook.ts` verifies the signature, then runs `StripeWebhookEventSchema.safeParse(parsed)` inline and throws on failure; `app/api/sponsors/webhook/route.ts` turns that into an error response.

## Logging

Parsers only `console.error("<parserName>: invalid … payload", result.error)`. Console output is not sent to Sentry: no init adds `consoleLoggingIntegration` and nothing calls `Sentry.logger`. If a validation failure needs an alert, call `captureException` in the wrapper with the real error and a `section` tag (see `lib/api/events.ts`).

## Checklist

- [ ] DTO type in `types/api/`, schema + `parse*` in `lib/validation/<resource>.ts`
- [ ] `safeParse`, never `parse`, on backend data
- [ ] Fallback matches the shape (`null`, `[]`, valid items, or `null` → empty page in the caller)
- [ ] Nullable backend fields modelled with `.nullish()`
- [ ] Test the parser with a real (trimmed) backend payload and a broken one
