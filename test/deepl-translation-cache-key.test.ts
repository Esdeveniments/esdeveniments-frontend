import { describe, expect, it } from "vitest";

import { hashText, getCacheKey } from "../app/e/[eventId]/translation-utils";

describe("DeepL translation cache key", () => {
  it("is deterministic for the same (text, lang)", () => {
    const text = "a càrrec de Carme Porcel - Lloc: Sala d'Actes de la Biblioteca";
    const k1 = getCacheKey(text, "en");
    const k2 = getCacheKey(text, "en");
    expect(k1).toBe(k2);
  });

  it("differs when target language differs", () => {
    const text = "a càrrec de Carme Porcel - Lloc: Sala d'Actes de la Biblioteca";
    const enKey = getCacheKey(text, "en");
    const esKey = getCacheKey(text, "es");
    expect(enKey).not.toBe(esKey);
    expect(enKey.startsWith("en:")).toBe(true);
    expect(esKey.startsWith("es:")).toBe(true);
  });

  it("differs for different text (sanity check)", () => {
    const t1 = "Hola món";
    const t2 = "Adeu món";
    const k1 = getCacheKey(t1, "en");
    const k2 = getCacheKey(t2, "en");
    expect(k1).not.toBe(k2);
  });

  it("produces a compact hash segment (16 hex chars)", () => {
    const text = "Lorem ipsum dolor sit amet";
    const hash = hashText(text);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });
});


