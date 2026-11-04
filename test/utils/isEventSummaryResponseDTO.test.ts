import { describe, expect, it } from "vitest";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { ListEvent } from "types/api/event";

const summary = { hash: "h", slug: "s", title: "t" } as unknown as ListEvent;

describe("isEventSummaryResponseDTO", () => {
  it("accepts a v2 summary that has no type field", () => {
    expect(isEventSummaryResponseDTO(summary)).toBe(true);
  });

  it("rejects an ad", () => {
    const ad = { isAd: true, id: "ad-1", slug: "s", hash: "h", title: "t" };
    expect(isEventSummaryResponseDTO(ad as ListEvent)).toBe(false);
  });

  it("rejects objects missing the summary fields", () => {
    expect(isEventSummaryResponseDTO({ isAd: true, id: "1" })).toBe(false);
    expect(isEventSummaryResponseDTO({ slug: "s" } as unknown as ListEvent)).toBe(false);
  });
});
