import { describe, it, expect } from "vitest";
import { buildListPageFaqItems } from "@utils/list-page-faq";

const labels = {
  q1: "What can I do {contextInline}?",
  a1: "In {capitalizedContext} you'll find concerts.",
  q2: "Are there free activities {contextInline}?",
  a2: "Yes, free activities {contextInline}.",
  q3: "Where can I see {categoryName} {contextInline}?",
  a3: "Select {categoryName} {contextInline}.",
};

const dateLabels = {
  inline: { fallback: "the coming days" },
  capitalized: { fallback: "The coming days" },
  fallbackInline: "the coming days",
  fallbackCapitalized: "The coming days",
};

describe("buildListPageFaqItems localization", () => {
  it("uses 'in' preposition for English scope phrases", () => {
    const items = buildListPageFaqItems({
      place: "barcelona",
      locale: "en",
      labels,
      dateLabels,
    });

    expect(items[0]?.q).toContain("the coming days in barcelona");
    expect(items[0]?.q).not.toContain(" a barcelona");
  });

  it("uses 'en' preposition for Spanish scope phrases", () => {
    const items = buildListPageFaqItems({
      place: "barcelona",
      locale: "es",
      labels,
      dateLabels,
    });

    expect(items[0]?.q).toContain("the coming days en barcelona");
    expect(items[0]?.q).not.toContain(" a barcelona");
  });
});
