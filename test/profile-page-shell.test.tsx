import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";
import type { ProfileDetailResponseDTO } from "types/api/profile";

// Control the only data input (the user's events).
vi.mock("@lib/api/profiles", () => ({
  fetchUserEvents: vi.fn(),
}));
// Hermetic locale helpers so the shell doesn't depend on root-params at runtime.
vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: async () => "ca",
  toLocalizedUrl: (path: string) => path,
}));

import ProfilePageShell from "components/partials/ProfilePageShell";
import { fetchUserEvents } from "@lib/api/profiles";
import List from "@components/ui/list";
import NoEventsFound from "@components/ui/common/noEventsFound";

const mockFetchUserEvents = vi.mocked(fetchUserEvents);

const profile: ProfileDetailResponseDTO = {
  id: "u1",
  name: "Sala Apolo",
  username: "sala-apolo",
};

function makeEvent(id: string): EventSummaryResponseDTO {
  // Future dates so filterActiveEvents keeps it (it drops past events).
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id,
    hash: `hash-${id}`,
    slug: `event-${id}`,
    title: `Event ${id}`,
    type: "FREE",
    url: "https://example.com",
    description: "",
    imageUrl: "",
    startDate: future,
    startTime: null,
    endDate: future,
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
function findAllByType(node: unknown, type: unknown): ReactElement[] {
  const acc: ReactElement[] = [];
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    const el = n as ReactElement;
    if (el.type === type) acc.push(el);
    const children = (el.props as { children?: unknown } | undefined)?.children;
    if (children) visit(children);
  };
  visit(node);
  return acc;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfilePageShell events section", () => {
  it("renders the events list when the user has upcoming events", async () => {
    mockFetchUserEvents.mockResolvedValue(paged([makeEvent("1"), makeEvent("2")]));

    const element = await ProfilePageShell({ profile });

    const lists = findAllByType(element, List);
    expect(lists).toHaveLength(1);
    expect((lists[0].props as { events: unknown[] }).events).toHaveLength(2);
    expect(findAllByType(element, NoEventsFound)).toHaveLength(0);
    expect(mockFetchUserEvents).toHaveBeenCalledWith("sala-apolo", 0, 20);
  });

  it("renders the empty state when the user has no events", async () => {
    mockFetchUserEvents.mockResolvedValue(paged([]));

    const element = await ProfilePageShell({ profile });

    expect(findAllByType(element, NoEventsFound)).toHaveLength(1);
    expect(findAllByType(element, List)).toHaveLength(0);
  });

  it("drops past events from the list (only upcoming render)", async () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pastEvent = { ...makeEvent("old"), startDate: past, endDate: past };
    mockFetchUserEvents.mockResolvedValue(paged([pastEvent, makeEvent("new")]));

    const element = await ProfilePageShell({ profile });

    const lists = findAllByType(element, List);
    expect(lists).toHaveLength(1);
    expect((lists[0].props as { events: { id: string }[] }).events).toEqual([
      expect.objectContaining({ id: "new" }),
    ]);
  });
});
