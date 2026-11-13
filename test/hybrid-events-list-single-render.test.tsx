import { describe, it, expect, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import EventCardList from "@components/ui/card/EventCardList";
import HeadingLayout from "@components/ui/hybridEventsList/HeadingLayout";
import SearchAwareHeading from "@components/ui/hybridEventsList/SearchAwareHeading";
import CountLine from "@components/ui/hybridEventsList/CountLine";
import { render, screen } from "@testing-library/react";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments } from "@utils/url-parsing";
import type { ListEvent } from "types/api/event";

vi.mock("@components/ui/sponsor/SponsorBannerSlot", () => ({ default: () => null }));
vi.mock("@components/context/UrlFiltersContext", () => ({
  useSharedUrlFilters: vi.fn(),
}));

// Count EventCardList elements anywhere in the tree, including Suspense fallbacks.
function countLists(node: ReactNode): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((n, c) => n + countLists(c), 0);
  const el = node as ReactElement<{ children?: ReactNode; fallback?: ReactNode }>;
  const self = el.type === EventCardList ? 1 : 0;
  return self + countLists(el.props?.children) + countLists(el.props?.fallback);
}

function findProps(node: ReactNode, type: unknown): Record<string, unknown> | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, type);
      if (found) return found;
    }
    return undefined;
  }
  const el = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>;
  if (el.type === type) return el.props;
  return findProps(el.props?.children, type);
}

describe("HybridEventsList server render", () => {
  it("renders the SSR list once, not again as a Suspense fallback", async () => {
    const events = [{ id: "1", hash: "h", slug: "s", title: "t", imageUrl: null }] as ListEvent[];
    const tree = await HybridEventsList({ initialEvents: events, place: "catalunya" });
    expect(countLists(tree)).toBe(1);
  });

  it("puts the count line before the server subtitle only, not the search heading", async () => {
    const events = [{ id: "1", hash: "h", slug: "s", title: "t", imageUrl: null }] as ListEvent[];
    const pageData = {
      title: "Què fer avui a Barcelona",
      subTitle: "Descobreix què fer avui.",
      metaTitle: "",
      metaDescription: "",
      canonical: "",
      notFoundTitle: "",
      notFoundDescription: "",
    };
    const tree = await HybridEventsList({
      initialEvents: events,
      place: "barcelona",
      date: "avui",
      pageData,
      countLine: "103 activitats avui.",
    });
    const subtitle = findProps(tree, HeadingLayout)?.subtitle as ReactNode;
    expect(findProps(subtitle, CountLine)?.text).toBe("103 activitats avui.");
    expect(findProps(tree, SearchAwareHeading)?.pageData).toBe(pageData);
  });
});

describe("CountLine", () => {
  const filtersFor = (query: string) =>
    parseFiltersFromUrl(
      extractURLSegments("/barcelona/avui"),
      new URLSearchParams(query),
    );

  it("shows the count on the unfiltered page", () => {
    vi.mocked(useSharedUrlFilters).mockReturnValue(filtersFor(""));
    render(<CountLine text="22 activitats avui." />);
    expect(screen.getByText("22 activitats avui.")).toBeVisible();
  });

  it("hides the count when a client filter narrows the list", () => {
    vi.mocked(useSharedUrlFilters).mockReturnValue(
      filtersFor("distance=5&lat=41.38&lon=2.17"),
    );
    render(<CountLine text="22 activitats avui." />);
    expect(screen.getByText("22 activitats avui.")).not.toBeVisible();
  });
});
