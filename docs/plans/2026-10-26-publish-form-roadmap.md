# Publish-form roadmap

Date: 2026-10-26. Tracking issue: [#558](https://github.com/Esdeveniments/esdeveniments-frontend/issues/558).

This document replaces the local-only implementation queue. It maps all 56 original P0-P4 and N1-N18 items to scoped issues. The issues contain acceptance criteria, dependencies, evidence and required checks.

The approved product direction is guest editing and preview, reliable device-local drafts, login/profile completion at publication, then a separate final Publish action. AI, field-policy and external-channel proposals retain their own decision gates. Creating an issue does not approve implementation, provider spend, outreach or deployment.

## Delivery order

| Order | Work | Why now / release boundary |
|---|---|---|
| 1 | [#522](https://github.com/Esdeveniments/esdeveniments-frontend/issues/522), [#525](https://github.com/Esdeveniments/esdeveniments-frontend/issues/525) through [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) | Diagnose uploads and build storage, recovery, auth return, then guest access. [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) is a mandatory release gate. |
| Parallel | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530) organizer evidence; [#531](https://github.com/Esdeveniments/esdeveniments-frontend/issues/531) telemetry; [#532](https://github.com/Esdeveniments/esdeveniments-frontend/issues/532) image formats; [#534](https://github.com/Esdeveniments/esdeveniments-frontend/issues/534) dates; [#535](https://github.com/Esdeveniments/esdeveniments-frontend/issues/535) auth locales; [#539](https://github.com/Esdeveniments/esdeveniments-frontend/issues/539) duplicate suggestions | These can start without new backend endpoints, subject to data/account permissions. Do not delay a known reliability fix for a large research programme. |
| Decision | [#533](https://github.com/Esdeveniments/esdeveniments-frontend/issues/533) field policy; [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536) rights, review and quotas | Keep optional-image/cap changes separate from the approved login flow. Set provider and review limits before automated intake. |
| 2 | [#537](https://github.com/Esdeveniments/esdeveniments-frontend/issues/537) single-poster extraction, then [#538](https://github.com/Esdeveniments/esdeveniments-frontend/issues/538) editable review | Reuse the same form and saved draft. Approve the provider, retention and spend first; guest editing does not imply anonymous AI access. |
| 3 | [#49](https://github.com/Esdeveniments/esdeveniments-frontend/issues/49) description aid; [#540](https://github.com/Esdeveniments/esdeveniments-frontend/issues/540) text/link input; [#542](https://github.com/Esdeveniments/esdeveniments-frontend/issues/542) programmes; [#548](https://github.com/Esdeveniments/esdeveniments-frontend/issues/548) publication outcome/QR | Extend only after the single-event review path works. A link/QR can be independent; social delivery claims need evidence. |
| Contract / feasibility | [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541) repeat events; [#543](https://github.com/Esdeveniments/esdeveniments-frontend/issues/543) Instagram proof; [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545) source sync; [#550](https://github.com/Esdeveniments/esdeveniments-frontend/issues/550) claiming; [#551](https://github.com/Esdeveniments/esdeveniments-frontend/issues/551) venues; [#231](https://github.com/Esdeveniments/esdeveniments-frontend/issues/231) pricing | These require explicit platform or backend decisions. [#544](https://github.com/Esdeveniments/esdeveniments-frontend/issues/544) Instagram implementation stays blocked until its prerequisites pass. |
| Later | [#546](https://github.com/Esdeveniments/esdeveniments-frontend/issues/546), [#547](https://github.com/Esdeveniments/esdeveniments-frontend/issues/547), [#549](https://github.com/Esdeveniments/esdeveniments-frontend/issues/549), [#552](https://github.com/Esdeveniments/esdeveniments-frontend/issues/552) through [#557](https://github.com/Esdeveniments/esdeveniments-frontend/issues/557) | Start with a bounded experiment or contract decision. Each channel needs a separate implementation decision. |

The old equal-weight idea scores estimated feasibility; they did not measure demand or define this delivery order.

## Approved login flow

Open the editor without an account and disclose that publication needs a free account. Save text and real image bytes locally with an honest save state. Let the user preview, then flush the draft before login or profile navigation. Restore the exact draft on return and require a fresh final Publish click.

Build in order: [#525](https://github.com/Esdeveniments/esdeveniments-frontend/issues/525) storage, [#526](https://github.com/Esdeveniments/esdeveniments-frontend/issues/526) autosave/restore, [#527](https://github.com/Esdeveniments/esdeveniments-frontend/issues/527) auth/profile return, [#528](https://github.com/Esdeveniments/esdeveniments-frontend/issues/528) guest editing, [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) end-to-end and real-device proof. Keep server authorization unchanged. A failed save must not be presented as safe to leave. Ordinary revisits offer Restore/Discard; an initiated auth return can restore its exact draft.

Seven days of inactivity is the proposed draft expiry. The product owner has not separately approved that retention policy, and browsers may evict drafts sooner. Local drafts are not cloud sync or a shared-device security boundary. Keep account switching, denied storage, stale writes and ambiguous create failures in scope.

## Original plan coverage

Status describes the next action. "Ready" means no new backend design is needed to start the bounded task; it does not authorize deployment. "Decision" and "research" issues must produce a recorded answer before dependent implementation.

| ID | Item | Issue | Next action / dependency |
|---|---|---|---|
| P0-1 | Optional step-view telemetry | [#531](https://github.com/Esdeveniments/esdeveniments-frontend/issues/531) | Decide whether an unanswered question needs it. |
| P0-2 | Diagnose upload failures and typed errors | [#522](https://github.com/Esdeveniments/esdeveniments-frontend/issues/522) | Logs and actual deployed-path/device reproduction. |
| P0-3 | Optional duration/preview measurement | [#531](https://github.com/Esdeveniments/esdeveniments-frontend/issues/531) | Consent-aware measurement decision. |
| P0-4 | Missing analytics dimensions | [#531](https://github.com/Esdeveniments/esdeveniments-frontend/issues/531) | Inspect current config; separate from [#521](https://github.com/Esdeveniments/esdeveniments-frontend/issues/521). |
| P0-5 | Internal traffic filtering | [#531](https://github.com/Esdeveniments/esdeveniments-frontend/issues/531) | Authorized configuration audit. |
| P0-6 | Organizer observations | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530) | Permissioned recruitment, including nonusers. |
| P1-1 | Consistent optional-field labels | [#533](https://github.com/Esdeveniments/esdeveniments-frontend/issues/533) | Agree policy; match shared validation. |
| P1-2 | Autosave/restore | [#525](https://github.com/Esdeveniments/esdeveniments-frontend/issues/525), [#526](https://github.com/Esdeveniments/esdeveniments-frontend/issues/526) | Approved direction; storage before integration. |
| P1-3 | Login at publication | [#527](https://github.com/Esdeveniments/esdeveniments-frontend/issues/527), [#528](https://github.com/Esdeveniments/esdeveniments-frontend/issues/528) | Approved direction; recovery first. |
| P1-4 | Stale sessions / expected errors | [#527](https://github.com/Esdeveniments/esdeveniments-frontend/issues/527), [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541) | 401/403 recovery now; typed duplicates need a contract. |
| P1-5 | Supported-format normalization | [#532](https://github.com/Esdeveniments/esdeveniments-frontend/issues/532) | Ready; test small files and decoding failures. |
| P1-6 | Optional cover | [#533](https://github.com/Esdeveniments/esdeveniments-frontend/issues/533) | Product decision; social selection remains separate. |
| P1-7 | Move dates earlier | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530) | Observe first; no layout change by assumption. |
| P1-8 | Fresh/resumed date defaults | [#534](https://github.com/Esdeveniments/esdeveniments-frontend/issues/534) | Ready; preserve chosen dates. |
| P1-9 | Translate image/error messages | [#532](https://github.com/Esdeveniments/esdeveniments-frontend/issues/532), [#522](https://github.com/Esdeveniments/esdeveniments-frontend/issues/522) | Keep machine reasons separate from user copy. |
| P1-10 | Length limits | [#533](https://github.com/Esdeveniments/esdeveniments-frontend/issues/533) | Approve caps; protect editing of existing content. |
| P1-11 | Real mobile proof | [#522](https://github.com/Esdeveniments/esdeveniments-frontend/issues/522), [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) | Android Chrome and iPhone Safari. |
| P1-12 | Hosted auth locales | [#535](https://github.com/Esdeveniments/esdeveniments-frontend/issues/535) | Inspect authorized tenant and browser paths. |
| P2-1 | Venue autocomplete | [#551](https://github.com/Esdeveniments/esdeveniments-frontend/issues/551) | Billing/terms and free-text fallback. |
| P2-2 | Exact venue coordinates | [#551](https://github.com/Esdeveniments/esdeveniments-frontend/issues/551) | Backend storage contract; not city centroids. |
| P2-3 | Repeat a past event | [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541) | Blocked on occurrence identity. |
| P2-4 | Price entry/display | [#231](https://github.com/Esdeveniments/esdeveniments-frontend/issues/231) | Reuse existing contract work; [#232](https://github.com/Esdeveniments/esdeveniments-frontend/issues/232) already overlaps. |
| P2-5 | Quotas, reports and review | [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536) | Durable operating/abuse model decision. |
| P2-6 | Profile events/drafts entry | [#550](https://github.com/Esdeveniments/esdeveniments-frontend/issues/550), [#526](https://github.com/Esdeveniments/esdeveniments-frontend/issues/526) | Reuse profiles; distinguish device-local drafts from account storage. |
| P3-1 | Structured-data pre-step | [#540](https://github.com/Esdeveniments/esdeveniments-frontend/issues/540) | Bounded recognized Event parsing. |
| P3-2 | Text/link draft | [#540](https://github.com/Esdeveniments/esdeveniments-frontend/issues/540) | Shared review plus safe remote fetching. |
| P3-3 | Single-poster draft | [#537](https://github.com/Esdeveniments/esdeveniments-frontend/issues/537) | Provider/data/spend decisions, then extraction. |
| P3-4 | Category suggestions | [#538](https://github.com/Esdeveniments/esdeveniments-frontend/issues/538) | Canonical IDs and explicit editable review. |
| P3-5 | Optional description aid | [#49](https://github.com/Esdeveniments/esdeveniments-frontend/issues/49) | Reuse existing issue and chosen provider. |
| P3-6 | Evaluation and rights | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530), [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536) | Permissioned fixtures and legal/operating decisions. |
| P3-7 | Accepted-output quality/cost | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530), [#537](https://github.com/Esdeveniments/esdeveniments-frontend/issues/537) | All attempts and review cost per accepted event. |
| P4-1 | Connected agendas | [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545) | One licensed source and lifecycle proof. |
| P4-2 | Occurrences/series | [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541) | Backend identity and update rules. |
| P4-3 | Venue/organizer entities | [#551](https://github.com/Esdeveniments/esdeveniments-frontend/issues/551), [#550](https://github.com/Esdeveniments/esdeveniments-frontend/issues/550) | Only fields/identity needed by approved workflows. |
| P4-4 | Content translation | [#552](https://github.com/Esdeveniments/esdeveniments-frontend/issues/552) | Backend/editorial contract first. |
| P4-5 | Mobile integration | [#556](https://github.com/Esdeveniments/esdeveniments-frontend/issues/556) | Identify the app repo and actual device/channel demand. |
| P4-6 | Authorized MCP drafts | [#557](https://github.com/Esdeveniments/esdeveniments-frontend/issues/557) | Partner demand, write authorization and confirmation. |
| P4-7 | Alternate desktop layout | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530) | Observation before a redesign issue. |

| ID | Idea | Issue | Next action / dependency |
|---|---|---|---|
| N1 | Instagram DM/shared-post draft | [#543](https://github.com/Esdeveniments/esdeveniments-frontend/issues/543), [#544](https://github.com/Esdeveniments/esdeveniments-frontend/issues/544) | Prove permitted attachment/account behavior first. |
| N2 | Caption/comment mention proposal | [#543](https://github.com/Esdeveniments/esdeveniments-frontend/issues/543), [#544](https://github.com/Esdeveniments/esdeveniments-frontend/issues/544) | Separate API families, own-media comments and cross-account mentions. |
| N3 | Programme to several drafts | [#542](https://github.com/Esdeveniments/esdeveniments-frontend/issues/542) | Successful single-event evaluation first. |
| N4 | Citizen street-poster submission | [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536) | Authority, image rights and a private review pilot. |
| N5 | Catalan voice draft | [#547](https://github.com/Esdeveniments/esdeveniments-frontend/issues/547) | Consented local-name/noise benchmark. |
| N6 | Already-listed suggestions | [#539](https://github.com/Esdeveniments/esdeveniments-frontend/issues/539) | Read-only title/date/place candidates; no silent merge. |
| N7 | Honest distribution benefit / QR | [#548](https://github.com/Esdeveniments/esdeveniments-frontend/issues/548) | Confirmed website link; conditional external delivery. |
| N8 | Follow opted-in professional IG accounts | [#543](https://github.com/Esdeveniments/esdeveniments-frontend/issues/543), [#544](https://github.com/Esdeveniments/esdeveniments-frontend/issues/544), [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545) | Account access proof and stable polling reconciliation. |
| N9 | Calendar/ICS sync | [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545) | UID/occurrence/timezone/update/cancel contract. |
| N10 | Past-event recurrence/reminders | [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541) | Identity plus explicit reminder preferences. |
| N11 | Organizer Reel | [#549](https://github.com/Esdeveniments/esdeveniments-frontend/issues/549) | Rights, measured cost and delivery pilot. |
| N12 | Claim sourced event | [#550](https://github.com/Esdeveniments/esdeveniments-frontend/issues/550) | Verified authority, disputes and audited transfer. |
| N13 | Newsletter/email intake | [#546](https://github.com/Esdeveniments/esdeveniments-frontend/issues/546) | Human inbox pilot before MIME/webhook automation. |
| N14 | Town ambassadors | [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536) | Named, trained and revocable reviewers. |
| N15 | Translate event content | [#552](https://github.com/Esdeveniments/esdeveniments-frontend/issues/552) | Original preservation and reviewed translated fields. |
| N16 | Post-print corrections | [#553](https://github.com/Esdeveniments/esdeveniments-frontend/issues/553) | Authorized lifecycle changes behind stable links. |
| N17 | Organizer browser capture | [#554](https://github.com/Esdeveniments/esdeveniments-frontend/issues/554) | Explicit temporary access and one owned-page pilot. |
| N18 | Venue booking to draft | [#555](https://github.com/Esdeveniments/esdeveniments-frontend/issues/555) | One consenting partner; public bookings only. |

WhatsApp, Telegram, SMS and PWA share-target work is grouped in [#556](https://github.com/Esdeveniments/esdeveniments-frontend/issues/556). These transports should reuse the same extraction and review. Wallet passes have no established separate organizer-effort benefit. Council/open-data, library, radio and managed-location feeds belong to [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545); no common AOC agenda API or universal source licence is assumed.

## Decisions and backend boundaries

| Decision | Where to settle it |
|---|---|
| D1 login timing | Approved direction in [#525](https://github.com/Esdeveniments/esdeveniments-frontend/issues/525)-[#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529); no automatic post-login create. |
| D2 categories, D3 cover | [#533](https://github.com/Esdeveniments/esdeveniments-frontend/issues/533); preserve current policies until approved. |
| D4 AI access, D5 execution location, D6 vision pilot | [#530](https://github.com/Esdeveniments/esdeveniments-frontend/issues/530), [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536), [#537](https://github.com/Esdeveniments/esdeveniments-frontend/issues/537); choose one schema/provider route and bound spend. |
| D7 price semantics | [#231](https://github.com/Esdeveniments/esdeveniments-frontend/issues/231); free-text price does not establish isFree/ticketUrl. |
| D8 moderation | [#536](https://github.com/Esdeveniments/esdeveniments-frontend/issues/536); an event count is not a trust or authority score. |
| Occurrence identity and typed duplicates | [#541](https://github.com/Esdeveniments/esdeveniments-frontend/issues/541); do not evade collisions by adding fake URL fragments. |
| Claim/transfer authority | [#550](https://github.com/Esdeveniments/esdeveniments-frontend/issues/550); owner fields alone are insufficient. |
| Sync/cancellation, coordinates, translated fields | [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545), [#553](https://github.com/Esdeveniments/esdeveniments-frontend/issues/553), [#555](https://github.com/Esdeveniments/esdeveniments-frontend/issues/555), [#551](https://github.com/Esdeveniments/esdeveniments-frontend/issues/551), [#552](https://github.com/Esdeveniments/esdeveniments-frontend/issues/552) need explicit backend contracts. |
| Current production/backend compatibility | [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) and the [v2 migration plan](2026-10-19-backend-contract-v2.md). Do not deploy all of develop as a shortcut. |

Local drafts, read-only suggestions and approved human pilots can proceed without new backend endpoints. This does not permit an owner-dependent feature to fall back silently to anonymous publication when v2 is late.

## Evidence snapshot and limits

Research checked frontend `87403d0148406aafafaea8580247bbbfa32eaf27` and backend `fa4f8acf30a58378b81f00ea01501f78f8bf8946` on 2026-10-25. These SHAs pin the research evidence. Check the deployed version separately and re-read current code before implementation.

| Evidence | Consequence |
|---|---|
| [Publish state, action and gates](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/app/%5Blocale%5D/publica/page.tsx), [auth navigation](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/lib/auth/AuthProvider.tsx) | Current form state cannot survive a new document by itself; recovery precedes moving login. |
| [Shared textarea](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/components/ui/common/form/textarea/index.tsx), [form schema](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/types/event.ts) | The reviewed 1,000-character cap is frontend code. Empty categories and labels need consistent policy. |
| Backend snapshot: `event/service/EventCrudService.java:262-266`; `event/entity/Event.java:49-104` | A non-null URL makes manual identity title+URL, ignoring changed dates. No reviewed Event PENDING/updatedAt/recurrence/translation contract. |
| Backend snapshot: `event/specification/EventSpecification.java:224-229`; `importer/enums/SourceType.java:3-7` | Title-substring search is not fuzzy matching. Source types are RSS/SCRAPE/JSON_API. No ICS sync implementation was established. |
| [Calendar utilities](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/utils/calendarUtils.tsx), [manifest](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/app/manifest.ts), [MCP](https://github.com/Esdeveniments/esdeveniments-frontend/blob/87403d0148406aafafaea8580247bbbfa32eaf27/app/mcp/route.ts) | Export is not inbound sync; no reviewed share_target; MCP tools are read-only. |
| CulturaCardedeu `d8ff705fb85d170923773e1621b3192b5f0c56ad`, `pages/api/analyzeImage.js:45-124` | The image/gateway pattern needs fresh live evaluation before reuse. Successful current extraction and generic city/date accuracy remain unproved. |
| Social publisher `99af591bb70f491052201936e914aef5cd63d920`, `src/feed/selector.ts:227-232`, `src/index.ts:251-255`, `video/` | No-image selection and real renderer code do not establish guaranteed network reach, on-demand delivery or free video cost. |

Backend paths above are relative to `src/main/java/com/esdeveniments/backend/`. Cross-repository source citations are for the recorded revisions only.

Fresh signed-out desktop checks on 2026-10-26 found guest editing/preview and unsaved-title recovery in Partiful. Luma, Eventbrite and Humanitix required an account at the checked creation entry. Meetup's group-start flow required login, which is not the same task as standalone event creation. Tally allowed guest editing/preview and retained text on reload; Publish was not tested. No successful authentication, uploaded-image recovery, mobile behavior or conversion improvement was established by those competitor checks.

Platform access, quotas, reply windows, app review, pricing and licence terms must be rechecked against current official documentation and authorized account behavior. [#543](https://github.com/Esdeveniments/esdeveniments-frontend/issues/543) links Meta references; [#545](https://github.com/Esdeveniments/esdeveniments-frontend/issues/545) covers feed licences; [#546](https://github.com/Esdeveniments/esdeveniments-frontend/issues/546) covers Email Workers; [#547](https://github.com/Esdeveniments/esdeveniments-frontend/issues/547) covers transcription; [#556](https://github.com/Esdeveniments/esdeveniments-frontend/issues/556) covers messaging policies. A public media URL, tag or collaboration invite is not permission to reuse an image.

## Validation and scope

Each implementation issue includes its own tests; [#529](https://github.com/Esdeveniments/esdeveniments-frontend/issues/529) adds complete-flow proof rather than replacing them. Use targeted Vitest/Playwright coverage, `yarn typecheck`, `yarn lint`, `yarn i18n:check` when text changes, and the repository's `verify-que-fer` browser proof. Record actual device and deployed-version evidence. Do not claim a mocked auth response proves a real login round trip.

Close research issues only after recording the required evidence and go/no-go decision. Keep failed or inaccessible checks visible. Do not log draft contents, image bytes, voice recordings, credentials or participant data. Store only permissioned minimal fixtures with explicit retention.

This documentation change adds no application behavior and makes no release claim. The underlying detailed research remains historical context; unsupported competitor universals, old quota figures and assumed provider settings are not implementation requirements.
