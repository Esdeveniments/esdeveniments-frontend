---
name: i18n-best-practices
description: next-intl rules for this repo — localized links and navigation, server vs client translations, message namespaces, precompiled messages, localized JSON-LD URLs, and adding a locale. Use when adding links, translation keys, useTranslations/getTranslations calls, localized URLs, hreflang, or a new language.
---

# i18n Best Practices

Basics (locales `ca` default/`es`/`en`/`fr`, `as-needed` prefix, server vs client APIs): AGENTS.md › i18n.

## Links and navigation

Use `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` from `@i18n/routing` (`i18n/routing.ts`). `next/link` drops the locale: on `/es/barcelona` a link to `/girona` goes to Catalan `/girona`. ESLint warns on `next/link`. Exceptions: primitives that add the locale themselves, and external links (`<a>`).

## Translations

- Server: `const t = await getTranslations("Components.Filters")` (`next-intl/server`). Client: `const t = useTranslations("Components.Filters")`.
- Top-level namespaces in `messages/*.json`: `App`, `Components`, `Partials`, `Pages`, `Utils`, `Config`, `Sponsor`, `Sponsorship`, `Auth`. Use the dotted path, e.g. `useTranslations("Partials.GeneratePagesData")`.
- Add every key to `messages/ca.json`, `es.json`, `en.json` and `fr.json`; reuse keys first. `yarn i18n:check` (also in pre-push) finds missing keys.
- Messages are precompiled (`precompile: true` in `next.config.js`): every leaf is a plain ICU string. No arrays, no `t.raw()`. Lists (days, months, word lists) go in `i18n/locale-lists.json`.
- A client component that uses a new namespace: add it to `lib/i18n/client-namespaces.ts`. The layout sends the client only those namespaces; `test/i18n-client-namespaces.test.ts` fails otherwise.
- Place names in copy: never write `a {place}` or `de {place}` (Catalan contracts the article: "al Masnou", "del Maresme", "a l'Escala"). Use `{placeIn}`/`{placeOf}`/`{placeFrom}` in the message and fill them with `formatPlacePhrases(label, type, locale)` or `formatPlacePreposition(label, type, locale, false, relation)` (`utils/string-helpers.ts`). Hoist the value into a variable before `t()` so `yarn i18n:validate` sees the key. Bare `{place}` is only for labels with no preposition (breadcrumbs, filter chips). Backend-written Catalan text (news titles and descriptions say "a El Masnou") goes through `contractCatalanPlaceInText(text, placeName)` once, in its Zod parser (see `lib/validation/news.ts`). Organiser-written event titles are shown as written.
- Profile and organisation names: read them with `getProfileDisplayName(profile)` (`utils/profile-name.ts`, adds the missing "de" in backend names like "Ajuntament El Masnou"). In copy use `{nameOf}` from `formatNameOf(name, locale)` ("de l'Ajuntament", "del Museu") or `formatNamePrepositionParts(name, locale, "by")` ("per l'Ajuntament"); institution nouns and their articles live in `institutionArticles` (`i18n/locale-lists.json`).
- Shared utils that need labels at import time read `i18n/locale-labels.generated.json`, not `messages/*.json` (which would ship all locales to the browser). After editing the source keys (see `scripts/generate-locale-labels.mjs`) or `i18n/locale-lists.json`, run `yarn i18n:labels`.

## SEO URLs

- JSON-LD and other absolute URLs: `toLocalizedUrl(path, locale)` from `@utils/i18n-seo`.
- Breadcrumbs: `generateBreadcrumbList(breadcrumbs)` from `@components/partials/seo-meta`. It takes no locale; pass items whose URLs are already localized with `toLocalizedUrl`.

## Adding a locale

1. Add the locale code and English name to `config/locales.json` (`SUPPORTED_LOCALES`, `AppLocale`, `NON_DEFAULT_LOCALES`, `LOCALE_NAMES` and `localeToHrefLang` in `types/i18n.ts` derive from it, as do the Node/Python scripts, `robots.txt` and AI discovery routes; if `defaultLocale` ever changes, update `DEFAULT_LOCALE` in `types/i18n.ts` to match).
2. Add the new entry to the exhaustive `Record<AppLocale, ...>` / `Record<NonDefaultLocale, ...>` maps flagged by `yarn typecheck`: `localeToOgLocale` and `DEEPL_TARGET_LANG` (`types/i18n.ts`), `messagesLoaders` (`i18n/request.ts`), `LOCALE_MAP` (`components/ui/common/form/DateRangeCalendar.tsx`), and the Stripe Checkout maps (`lib/stripe/checkout-helpers.ts`), plus `test/mocks/next-intl.ts`.
3. Add `messages/<locale>.json` with every key (plus the language label under `Components.Navbar.languages`, `languagesShort`, and `Components.Description.target` in all locale files), and the locale's entries in `i18n/locale-lists.json` (`constants` and `websiteSchema`); run `yarn i18n:labels`.
4. Add language-specific grammar/date formatting if needed (`utils/string-helpers.ts`, `utils/date-helpers.ts`) and verify with `yarn i18n:check && yarn i18n:validate && yarn typecheck && yarn test --run`.

## Key files

| File | Role |
| --- | --- |
| `config/locales.json` | Single source of truth for `defaultLocale` and supported `locales` |
| `i18n/routing.ts` | Routing config and navigation exports |
| `i18n/request.ts` | Loads messages per locale |
| `types/i18n.ts` | `SUPPORTED_LOCALES`, `AppLocale`, OG/hreflang/DeepL maps |
| `next.config.js` | next-intl plugin with `precompile: true` |
| `i18n/locale-lists.json` | Non-string lists per locale |
| `i18n/locale-labels.generated.json` | Generated labels for shared utils |
| `lib/i18n/client-namespaces.ts` | Namespaces sent to client components |
| `utils/i18n-seo.ts` | `toLocalizedUrl`, `getLocaleSafely` |
| `proxy.ts` | Sets `x-next-intl-locale` |
