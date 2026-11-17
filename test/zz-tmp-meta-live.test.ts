import { it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { generateEventMetadata } from "../lib/meta";

const SUFFIX = {
  ca: "Consulta l'horari, com arribar-hi i més plans a prop.",
  es: "Consulta el horario, cómo llegar y más planes cerca.",
  en: "See times, directions and more things to do nearby.",
} as const;

it("dumps meta for the live DTOs", () => {
  const rows = JSON.parse(readFileSync("/tmp/meta-live/events.json", "utf8"));
  const out = rows.map((row: any) => {
    const res: Record<string, unknown> = { slug: row.slug, live: row.liveMetaDescription };
    for (const locale of ["ca", "es", "en"] as const) {
      const meta = generateEventMetadata(row.dto, undefined, undefined, locale, SUFFIX[locale]);
      res[locale] = {
        title: meta.title,
        description: meta.description,
        og: meta.openGraph?.description,
        tw: meta.twitter?.description,
      };
    }
    return res;
  });
  writeFileSync(`/tmp/meta-live/out-${process.env.META_TAG}.json`, JSON.stringify(out, null, 1));
});
