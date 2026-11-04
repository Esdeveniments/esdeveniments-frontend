import { describe, it, expect, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import List from "@components/ui/list";
import type { ListEvent } from "types/api/event";

vi.mock("@components/ui/sponsor/SponsorBannerSlot", () => ({ default: () => null }));

// Count List elements anywhere in the tree, including Suspense fallbacks.
function countLists(node: ReactNode): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((n, c) => n + countLists(c), 0);
  const el = node as ReactElement<{ children?: ReactNode; fallback?: ReactNode }>;
  const self = el.type === List ? 1 : 0;
  return self + countLists(el.props?.children) + countLists(el.props?.fallback);
}

describe("HybridEventsList server render", () => {
  it("renders the SSR list once, not again as a Suspense fallback", async () => {
    const events = [{ id: "1", hash: "h", slug: "s", title: "t", imageUrl: null }] as ListEvent[];
    const tree = await HybridEventsList({ initialEvents: events, place: "catalunya" });
    expect(countLists(tree)).toBe(1);
  });
});
