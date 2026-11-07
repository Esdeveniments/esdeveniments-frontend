// Town-page SEO test (plan, start date and results in
// docs/growth/paid-acquisition-research-2026-11.md › Town-page test).
// 30 towns with similar Search Console impressions (Mar–Jun 2026), split at
// random in blocks of three. Remove this file and its two readers when the
// test ends.

/** Group A: new meta title only. */
export const TOWN_TEST_TITLE_GROUP: ReadonlySet<string> = new Set([
  "tarragona",
  "canet-de-mar",
  "sant-pol-de-mar",
  "vilanova-i-la-geltru",
  "palamos",
  "mataro",
  "sant-quirze-del-valles",
  "figueres",
  "castellbisbal",
  "llinars-del-valles",
]);

/** Group B: data-built intro, plus comarca events when the town has few. */
export const TOWN_TEST_CONTENT_GROUP: ReadonlySet<string> = new Set([
  "granollers",
  "argentona",
  "la-garriga",
  "arenys-de-munt",
  "vilassar-de-mar",
  "tona",
  "bigues-i-riells",
  "calella",
  "vallirana",
  "alella",
]);

/** Group C: unchanged; listed so results can be compared against it. */
export const TOWN_TEST_CONTROL_GROUP: ReadonlySet<string> = new Set([
  "el-masnou",
  "altafulla",
  "arenys-de-mar",
  "cardedeu",
  "malgrat-de-mar",
  "caldes-de-montbui",
  "igualada",
  "badalona",
  "montgat",
  "roda-de-ter",
]);

/** Below this many upcoming events, group B pages also show comarca events. */
export const TOWN_TEST_MIN_EVENTS = 8;
