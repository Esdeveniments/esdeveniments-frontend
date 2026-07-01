# Public User Profile API

The public "profile" page (`/perfil/{slug}`) is backed by the backend's public
**user** endpoints. An earlier draft of this doc proposed a richer `/api/v1/profiles/*`
surface; the backend implemented a leaner user model instead. This documents what
actually ships plus the gap the frontend is already prepared for.

## Live endpoints

| Endpoint | Method | Params | Auth | Response |
|---|---|---|---|---|
| `/api/users/{username}` | GET | — | public (HMAC) | `UserPublicResponseDTO` |
| `/api/users/{username}/events` | GET | `page`, `size` | public (HMAC) | `PagedResponseDTO<EventSummaryResponseDTO>` |
| `/api/users/me/favorites/events` | GET | `page`, `size` | Bearer | `PagedResponseDTO<EventSummaryResponseDTO>` |
| `/api/users/me/favorites/events/{eventId}` | GET | — | Bearer | `FavoriteStatusResponseDTO` |
| `/api/users/me/favorites/events/{eventId}` | POST / DELETE | — | Bearer | — |

`GET /api/events` has **no** `profile`/`username` filter — per-user event listings
must use `/api/users/{username}/events`.

## DTOs

### UserPublicResponseDTO

```json
{
  "id": "uuid",
  "name": "Sala Apolo",
  "username": "sala-apolo",
  "pictureUrl": "https://...",
  "createdAt": "2024-03-01T00:00:00Z"
}
```

`username` maps to the FE `slug`, `pictureUrl` to `avatarUrl`, `createdAt` to
`joinedDate`. See `mapUserToProfile` in `lib/api/profiles-external.ts`.

### FavoriteStatusResponseDTO

```json
{ "favorite": true }
```

## Backend gap (needed for the rich profile UI)

The profile header renders these conditionally and hides them when absent, so the
page works today. Add them to `UserPublicResponseDTO` and they light up with no FE
change:

- `bio`, `coverUrl`, `website`
- `verified` (boolean)
- `socialLinks` (`{ instagram, twitter, ... }`)
- `city`, `region`
- `totalEvents` (the FE currently derives this from the events listing's
  `totalElements`)
