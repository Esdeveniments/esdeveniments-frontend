# Profile API Spec (Backend)

> **Historical / unimplemented proposal — do not build against this.** The
> `/api/v1/profiles/*` endpoints and the separate `Profile` entity below were
> never built. The canonical, implemented contract is
> `GET /api/users/{username}` (see `lib/api/profiles.ts` and
> `docs/plans/2026-07-30-profile-events-split.md`). Everything past this
> notice is kept only as a record of the original proposal.

## Endpoints

| Endpoint | Method | Params | Response |
|---|---|---|---|
| `/api/v1/profiles/{slug}` | GET | — | `ProfileDetailResponseDTO` |
| `/api/v1/profiles` | GET | `?page&size` | `PagedResponseDTO<ProfileSummaryResponseDTO>` |
| `/api/v1/events?profile={slug}` | GET | existing filters + `profile` | `PagedResponseDTO<EventSummaryResponseDTO>` |

## DTOs

### ProfileSummaryResponseDTO

```json
{
  "id": "uuid",
  "slug": "razzmatazz",
  "name": "Razzmatazz",
  "avatarUrl": "https://...",
  "coverUrl": "https://...",
  "bio": "One of Barcelona's most iconic venues...",
  "website": "https://www.salarazzmatazz.com",
  "verified": true,
  "joinedDate": "2024-01-15",
  "totalEvents": 142,
  "city": "Barcelona",
  "region": "Barcelonès"
}
```

### ProfileDetailResponseDTO

Extends `ProfileSummaryResponseDTO` with:

```json
{
  "socialLinks": {
    "instagram": "https://instagram.com/razzmatazz",
    "twitter": "https://twitter.com/razzmatazz"
  }
}
```

## Backend work needed

- New `Profile` entity (id, name, slug, bio, avatarUrl, coverUrl, website, verified, city_id FK, created_at)
- Flyway migration V12 — create `profile` table + add nullable `profile_id` FK to `event` table
- `ProfileRepository`, `ProfileService`, `ProfileController`
- Add `profile` filter to `EventFilterDTO` + `EventSpecification.filterByProfile()`
- `ProfileSummaryResponseDTO`, `ProfileDetailResponseDTO` Java DTOs
