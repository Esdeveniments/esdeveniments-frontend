import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";

// Control the only data input (the user's events).
vi.mock("@lib/api/profiles", () => ({
  fetchUserEvents: vi.fn(),
}));

import ProfileEventsSection from "components/partials/ProfileEventsSection";
import { fetchUserEvents } from "@lib/api/profiles";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";

const mockFetchUserEvents = vi.mocked(fetchUserEvents);

function makeEvent(id: string, startDate: string): EventSummaryResponseDTO {
  return {
    id,
    hash: `hash-${id}`,
    slug: `event-${id}`,
    title: `Event ${id}`,
    type: "FREE",
    url: "https://example.com",
    description: "",
    imageUrl: "",
    startDate,
    startTime: null,
    endDate: startDate,
    endTime: null,
    location: "Barcelona",
    visits: 0,
    origin: "MANUAL",
    categories: [],
  };
}

function paged(
  content: EventSummaryResponseDTO[]
): PagedResponseDTO<EventSummaryResponseDTO> {
  return {
    content,
    currentPage: 0,
    pageSize: 20,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  };
}

// Recursively collect every element of a given component type in the tree.
// Resolves function-component boundaries (invokes them with their own
// props) so the walk can see past a wrapper like EventsSection into what
// it renders — otherwise a component whose data comes in via non-children
// props (not the `children` prop) hides everything inside it from a walk
// that only recurses through `.props.children`.
function findAllByType(node: unknown, type: unknown): ReactElement[] {
  const acc: ReactElement[] = [];
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    const el = n as ReactElement;
    if (el.type === type) {
      acc.push(el);
    } else if (typeof el.type === "function") {
      visit((el.type as (props: unknown) => unknown)(el.props));
      return;
    }
    const children = (el.props as { children?: unknown } | undefined)?.children;
    if (children) visit(children);
  };
  visit(node);
  return acc;
}

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileEventsSection", () => {
  it("passes status=upcoming to fetchUserEvents and renders whatever the backend returns", async () => {
    mockFetchUserEvents.mockResolvedValue(
      paged([makeEvent("1", future), makeEvent("2", future)])
    );

    const element = await ProfileEventsSection({
      username: "sala-apolo",
      status: "upcoming",
    });

    expect(mockFetchUserEvents).toHaveBeenCalledWith(
      "sala-apolo",
      0,
      20,
      "upcoming"
    );
    const lists = findAllByType(element, List);
    expect(lists).toHaveLength(1);
    expect((lists[0].props as { events: unknown[] }).events).toHaveLength(2);
    expect(findAllByType(element, NoEventsFound)).toHaveLength(0);
  });

  it("passes status=past to fetchUserEvents and renders past events unfiltered", async () => {
    // A past event would have been dropped by the old filterActiveEvents —
    // the whole point of the split is that the backend, not the frontend,
    // decides what belongs on this tab.
    mockFetchUserEvents.mockResolvedValue(paged([makeEvent("old", past)]));

    const element = await ProfileEventsSection({
      username: "sala-apolo",
      status: "past",
    });

    expect(mockFetchUserEvents).toHaveBeenCalledWith(
      "sala-apolo",
      0,
      20,
      "past"
    );
    const lists = findAllByType(element, List);
    expect(lists).toHaveLength(1);
    expect((lists[0].props as { events: { id: string }[] }).events).toEqual([
      expect.objectContaining({ id: "old" }),
    ]);
  });

  it("renders the empty state when the backend returns no events", async () => {
    mockFetchUserEvents.mockResolvedValue(paged([]));

    const element = await ProfileEventsSection({
      username: "sala-apolo",
      status: "upcoming",
    });

    expect(findAllByType(element, NoEventsFound)).toHaveLength(1);
    expect(findAllByType(element, List)).toHaveLength(0);
  });
});
