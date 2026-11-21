import { describe, expect, it } from "vitest";
import { isAllowedVisionModel } from "@lib/api/ai-gateway";
import {
  buildPosterExtractionPrompt,
  hasExtractedEventData,
  parseAiJson,
  parsePosterExtraction,
  resolvePosterPrice,
} from "@lib/validation/poster-extraction";
import {
  applyPosterExtractionToForm,
  matchCategoryOptions,
  matchCityOption,
  undoPosterAutofill,
} from "@utils/poster-autofill";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { Option } from "types/common";
import type { FormData } from "types/event";
import type { PosterAutofillUndoRecord } from "types/api/poster";

const CATEGORIES: CategorySummaryResponseDTO[] = [
  { id: 1, name: "Concerts", slug: "concerts" },
  { id: 2, name: "Teatre", slug: "teatre" },
  { id: 3, name: "Exposicions", slug: "exposicions" },
  { id: 4, name: "Festivals", slug: "festivals" },
];

const CITY_OPTIONS: Option[] = [
  { value: "10", label: "Cardedeu", placeType: "town" },
  { value: "11", label: "Mataró", placeType: "town" },
  { value: "12", label: "El Masnou", placeType: "town" },
  { value: "13", label: "L'Escala", placeType: "town" },
  { value: "14", label: "L'Hospitalet de Llobregat", placeType: "town" },
  { value: "15", label: "Vic", placeType: "town" },
  { value: "16", label: "Sant Joan", placeType: "town" },
  { value: "17", label: "Sant Joan", placeType: "town" },
  { value: "18", label: "Sant Cugat del Vallès", placeType: "town" },
  { value: "19", label: "Sant Cugat Sesgarrigues", placeType: "town" },
];

const CITY_TO_REGION: Record<string, Option> = {
  "10": { value: "100", label: "Vallès Oriental", placeType: "region" },
  "11": { value: "101", label: "Maresme", placeType: "region" },
  "12": { value: "101", label: "Maresme", placeType: "region" },
  "13": { value: "102", label: "Alt Empordà", placeType: "region" },
  "14": { value: "103", label: "Barcelonès", placeType: "region" },
  "15": { value: "104", label: "Osona", placeType: "region" },
  "16": { value: "105", label: "Ripollès", placeType: "region" },
  "17": { value: "106", label: "Bages", placeType: "region" },
};

const BASE_FORM: FormData = {
  title: "",
  description: "",
  startDate: "2026-11-21T09:00",
  startTime: "",
  endDate: "2026-11-21T10:00",
  endTime: "",
  region: null,
  town: null,
  location: "",
  url: "",
  categories: [],
  email: "",
};

describe("parseAiJson", () => {
  it("strips markdown fences and escapes raw control characters inside JSON strings", () => {
    const raw =
      '```json\n{\n  "title": "Concert de Jazz",\n  "description": "Primera línia.\n\nSegona línia."\n}\n```';
    const parsed = parseAiJson(raw) as { title: string; description: string };
    expect(parsed.title).toBe("Concert de Jazz");
    expect(parsed.description).toBe("Primera línia.\n\nSegona línia.");
  });

  it("recovers JSON wrapped in stray prose from fallback providers", () => {
    const raw = 'Aquí tens les dades:\n{"title":"Fira","description":null}\nGràcies!';
    expect(parseAiJson(raw)).toEqual({ title: "Fira", description: null });
  });

  it("still throws on malformed backslash before raw control characters", () => {
    expect(() => parseAiJson('{"a":"x\\\ty"}')).toThrow();
    expect(() => parseAiJson('{"a":"x\\\ny"}')).toThrow();
  });
});

describe("buildPosterExtractionPrompt", () => {
  it("anchors to Europe/Madrid date, respects locale, and lists allowed category slugs", () => {
    const promptCa = buildPosterExtractionPrompt({
      now: new Date("2026-11-21T12:00:00Z"),
      categories: CATEGORIES,
    });
    expect(promptCa).toContain("2026-11-21");
    expect(promptCa).toContain("idiomatic Catalan");
    expect(promptCa).toContain("- concerts (Concerts)");
    expect(promptCa).toContain("NEVER use Markdown # headings");
    expect(promptCa).toContain("taquilla inversa");

    const promptEn = buildPosterExtractionPrompt({
      now: new Date("2026-11-21T12:00:00Z"),
      locale: "en",
    });
    expect(promptEn).toContain("idiomatic English");
  });
});

describe("isAllowedVisionModel", () => {
  it("accepts Gemini and Gemma 4 vision models and rejects text-only fallbacks", () => {
    expect(isAllowedVisionModel("gemini/gemini-4-hydrogen")).toBe(true);
    expect(isAllowedVisionModel("gemini/gemini-3.6-flash")).toBe(true);
    expect(isAllowedVisionModel("gemini/gemma-4-31b-it")).toBe(true);
    expect(isAllowedVisionModel("google/gemma-4-26b-a4b-it:free")).toBe(true);
    expect(isAllowedVisionModel("groq/openai/gpt-oss-120b")).toBe(false);
    expect(isAllowedVisionModel("deepseek/deepseek-v4-flash")).toBe(false);
    expect(isAllowedVisionModel(null)).toBe(false);
  });
});

describe("resolvePosterPrice", () => {
  it("maps exact free entry to free", () => {
    expect(resolvePosterPrice("Entrada lliure")).toEqual({
      priceType: "free",
      priceAmount: "",
      originalPrice: null,
      needsReview: false,
    });
  });

  it("maps donation-based taquilla inversa to unknown with review flag (never free)", () => {
    expect(resolvePosterPrice("Taquilla inversa")).toEqual({
      priceType: "unknown",
      priceAmount: "",
      originalPrice: "Taquilla inversa",
      needsReview: true,
    });
  });

  it("resolves multi-tier paid prices to lowest paid amount and flags review", () => {
    expect(resolvePosterPrice("Anticipada 8,50 € / Taquilla 10 €")).toEqual({
      priceType: "paid",
      priceAmount: "8.5",
      originalPrice: "Anticipada 8,50 € / Taquilla 10 €",
      needsReview: true,
    });
  });

  it("resolves mixed free + paid tiers to lowest paid amount (never false free)", () => {
    expect(resolvePosterPrice("Gratuït per a socis · 5 € no socis")).toEqual({
      priceType: "paid",
      priceAmount: "5",
      originalPrice: "Gratuït per a socis · 5 € no socis",
      needsReview: true,
    });
  });

  it("resolves single paid amount cleanly without flagging review", () => {
    expect(resolvePosterPrice("12 €")).toEqual({
      priceType: "paid",
      priceAmount: "12",
      originalPrice: null,
      needsReview: false,
    });
  });
});

describe("parsePosterExtraction", () => {
  const anchor = new Date("2026-11-21T12:00:00Z");

  it("normalizes text, strips # headings and HTML, deduplicates town from location, and filters categories", () => {
    const extracted = parsePosterExtraction(
      {
        title: "  Concert de Tardor  ",
        description: "## Programa\n\n<b>Jazz</b> en directe.\n\n\n\n**20:00** Obertura de portes.",
        startDate: "2026-12-05T20:00",
        endDate: null,
        isAllDay: false,
        hasExplicitYear: true,
        isMultiEvent: false,
        town: "Cardedeu",
        location: "Teatre Auditori, Cardedeu",
        url: "entrapolis.com/concert-tardor",
        price: "15 €",
        categories: ["concerts", "invented-slug", "Teatre"],
      },
      { now: anchor, allowedCategories: CATEGORIES },
    );

    expect(extracted).not.toBeNull();
    expect(extracted?.title).toBe("Concert de Tardor");
    expect(extracted?.description).toBe(
      "Programa\n\nJazz en directe.\n\n**20:00** Obertura de portes.",
    );
    expect(extracted?.startDate).toBe("2026-12-05T20:00");
    expect(extracted?.endDate).toBe("2026-12-05T21:00");
    expect(extracted?.isAllDay).toBe(false);
    expect(extracted?.dateInferred).toBe(false);
    expect(extracted?.location).toBe("Teatre Auditori");
    expect(extracted?.url).toBe("https://entrapolis.com/concert-tardor");
    expect(extracted?.categories).toEqual(["concerts", "teatre"]);
    expect(hasExtractedEventData(extracted!)).toBe(true);
  });

  it("handles overnight spans, late-night rollover, timezone offsets, date-only all-day, and invalid dates", () => {
    // Late night without end time rolls cleanly across midnight (never equal start===end)
    const lateStart = parsePosterExtraction(
      { startDate: "2026-12-31T23:30", endDate: null, isAllDay: false },
      { now: anchor },
    );
    expect(lateStart?.startDate).toBe("2026-12-31T23:30");
    expect(lateStart?.endDate).toBe("2027-01-01T00:30");

    // Same-day overnight span rolls end to next day
    const overnight = parsePosterExtraction(
      { startDate: "2026-12-12T23:30", endDate: "2026-12-12T02:00", isAllDay: false },
      { now: anchor },
    );
    expect(overnight?.endDate).toBe("2026-12-13T02:00");

    // Explicit UTC offset converts to Europe/Madrid CEST (+02:00 in July)
    const utcOffset = parsePosterExtraction(
      { startDate: "2026-07-15T18:00:00Z", endDate: "2026-07-15T20:00:00Z", isAllDay: false },
      { now: anchor },
    );
    expect(utcOffset?.startDate).toBe("2026-07-15T20:00");
    expect(utcOffset?.endDate).toBe("2026-07-15T22:00");

    // Date-only becomes all-day
    const allDay = parsePosterExtraction(
      { startDate: "2027-05-29", endDate: "2027-05-31", isAllDay: true, hasExplicitYear: false },
      { now: anchor },
    );
    expect(allDay?.isAllDay).toBe(true);
    expect(allDay?.startDate).toBe("2027-05-29T00:00");
    expect(allDay?.endDate).toBe("2027-05-31T23:59");
    expect(allDay?.dateInferred).toBe(true);

    // Impossible calendar date is dropped
    const badDate = parsePosterExtraction(
      { startDate: "2026-02-31T10:00", endDate: null },
      { now: anchor },
    );
    expect(badDate?.startDate).toBeNull();
    expect(badDate?.endDate).toBeNull();

    // Valid leap day passes
    const leapDay = parsePosterExtraction(
      { startDate: "2028-02-29T19:00", endDate: null },
      { now: anchor },
    );
    expect(leapDay?.startDate).toBe("2028-02-29T19:00");
  });

  it("treats literal 'null'/'N/A' sentinels and empty non-poster replies as empty", () => {
    const empty = parsePosterExtraction(
      {
        title: "null",
        description: "N/A",
        startDate: null,
        endDate: null,
        isAllDay: false,
        town: "desconegut",
        location: "",
        url: "not a url",
        price: null,
        categories: [],
      },
      { now: anchor },
    );
    expect(empty).not.toBeNull();
    expect(hasExtractedEventData(empty!)).toBe(false);
  });
});

describe("matchCityOption and poster-autofill form merging", () => {
  it("matches accents, Catalan articles, inverted articles, comarca disambiguation, and unambiguous prefixes", () => {
    expect(matchCityOption("Mataro", CITY_OPTIONS)?.label).toBe("Mataró");
    expect(matchCityOption("Masnou", CITY_OPTIONS)?.label).toBe("El Masnou");
    expect(matchCityOption("Masnou, el", CITY_OPTIONS)?.label).toBe("El Masnou");
    expect(matchCityOption("Escala", CITY_OPTIONS)?.label).toBe("L'Escala");
    expect(matchCityOption("L’Escala", CITY_OPTIONS)?.label).toBe("L'Escala");
    expect(matchCityOption("Vic (Osona)", CITY_OPTIONS)?.label).toBe("Vic");
    expect(matchCityOption("L'Hospitalet", CITY_OPTIONS)?.label).toBe(
      "L'Hospitalet de Llobregat",
    );
    // Disambiguates duplicate municipality name using parenthetical comarca
    expect(matchCityOption("Sant Joan (Bages)", CITY_OPTIONS, CITY_TO_REGION)?.value).toBe("17");
    // Refuses ambiguous prefix without comarca
    expect(matchCityOption("Sant Cugat", CITY_OPTIONS)).toBeNull();
  });

  it("matches categories by slug or label without duplicates", () => {
    expect(matchCategoryOptions(["concerts", "Concerts", "teatre"], CATEGORIES)).toEqual([
      { value: "1", label: "Concerts" },
      { value: "2", label: "Teatre" },
    ]);
  });

  it("preserves user-typed fields including originalPrice and supports surgical Undo", () => {
    const extracted = parsePosterExtraction(
      {
        title: "Títol IA",
        description: "Descripció IA",
        startDate: "2027-03-10T19:00",
        endDate: "2027-03-10T21:00",
        isAllDay: false,
        hasExplicitYear: true,
        isMultiEvent: false,
        town: "Cardedeu",
        location: "Teatre Auditori",
        url: "https://example.cat",
        price: "10 €",
        categories: ["concerts"],
      },
      { now: new Date("2026-11-21T12:00:00Z"), allowedCategories: CATEGORIES },
    )!;

    const preTypedForm: FormData = {
      ...BASE_FORM,
      title: "Títol de l'usuari",
      originalPrice: "Tarifa especial",
    };

    const applied = applyPosterExtractionToForm({
      currentForm: preTypedForm,
      extracted,
      cityOptions: CITY_OPTIONS,
      cityToRegionOptionMap: CITY_TO_REGION,
      categories: CATEGORIES,
      autoDates: true,
    });

    // User title and originalPrice were preserved
    expect(applied.nextForm.title).toBe("Títol de l'usuari");
    expect(applied.nextForm.originalPrice).toBe("Tarifa especial");
    expect(applied.skippedFields).toContain("title");
    expect(applied.skippedFields).toContain("price");
    // Untouched fields were populated including region auto-derived from town
    expect(applied.nextForm.description).toBe("Descripció IA");
    expect(applied.nextForm.town).toEqual(CITY_OPTIONS[0]);
    expect(applied.nextForm.region).toEqual(CITY_TO_REGION["10"]);
    expect(applied.nextForm.location).toBe("Teatre Auditori");
    expect(applied.appliedDates).toBe(true);

    // User edits location after autofill -> removed from ownedFields
    const ownedAfterEdit = new Set(applied.filledFields);
    ownedAfterEdit.delete("location");
    const editedForm: FormData = {
      ...applied.nextForm,
      location: "Lloc editat manualment",
    };
    const undoRecord: PosterAutofillUndoRecord = {
      runId: 1,
      ownedFields: ownedAfterEdit,
      previousForm: preTypedForm,
      previousAutoDates: true,
    };

    const undone = undoPosterAutofill(editedForm, undoRecord);
    // Post-autofill edit survives Undo; untouched AI fields revert cleanly
    expect(undone.nextForm.location).toBe("Lloc editat manualment");
    expect(undone.nextForm.description).toBe("");
    expect(undone.nextForm.town).toBeNull();
    expect(undone.nextForm.region).toBeNull();
    expect(undone.nextForm.title).toBe("Títol de l'usuari");
    expect(undone.restoredAutoDates).toBe(true);
  });
});
