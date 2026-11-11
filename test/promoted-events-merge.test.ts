import { describe, expect, it } from "vitest";
import { mergePromotedEvents } from "@utils/promoted-events";
import type { EventSummaryResponseDTO } from "types/api/event";

const ev = (id: string) => ({ id }) as EventSummaryResponseDTO;
const ids = (events: EventSummaryResponseDTO[]) => events.map((e) => e.id);

describe("mergePromotedEvents", () => {
  it("keeps the town's promotions first and drops repeats from the comarca", () => {
    const town = [ev("a"), ev("b")];
    const comarca = [ev("c"), ev("a"), ev("d")];
    expect(ids(mergePromotedEvents([town, comarca], undefined, 8))).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves out the event being viewed", () => {
    expect(ids(mergePromotedEvents([[ev("self"), ev("b")], [ev("self")]], "self", 8))).toEqual(["b"]);
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => ev(String(i)));
    expect(mergePromotedEvents([many], undefined, 8)).toHaveLength(8);
  });
});
