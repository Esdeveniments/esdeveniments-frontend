import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { EventSummaryResponseDTO } from "types/api/event";

vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: async () => "ca",
}));

vi.mock("@components/ui/eventsAround/EventsAroundSection", () => ({
  default: ({ events, title }: { events: EventSummaryResponseDTO[]; title: string }) => (
    <div data-testid="region-events" data-title={title}>
      {events.map((e) => e.id).join(",")}
    </div>
  ),
}));

vi.mock("types/api/isEventSummaryResponseDTO", () => ({
  isEventSummaryResponseDTO: () => true,
}));

const fetchEventsCached = vi.fn();
vi.mock("@lib/api/events", () => ({
  fetchEventsCached: (...args: unknown[]) => fetchEventsCached(...args),
}));

import TownGuide from "@components/ui/townGuide/TownGuide";

const event = (id: string, category = "musica") =>
  ({ id, categories: [{ id: 1, slug: category, name: category }] }) as unknown as EventSummaryResponseDTO;

const props = {
  placeLabel: "Arenys de Munt",
  regionLabel: "Maresme",
  regionSlug: "maresme",
};

describe("TownGuide", () => {
  beforeEach(() => {
    fetchEventsCached.mockReset();
    fetchEventsCached.mockResolvedValue({ content: [event("1"), event("r1"), event("r2")] });
  });

  it("summarises the town and adds comarca events it doesn't already show", async () => {
    render(
      await TownGuide({ ...props, events: [event("1"), event("2", "teatre")], totalEvents: 2 }),
    );

    expect(screen.getByRole("heading")).toHaveTextContent("L'agenda d'Arenys de Munt");
    expect(screen.getByText(/Ara mateix hi ha 2 activitats programades a Arenys de Munt\./)).toBeInTheDocument();
    expect(screen.getByText(/Arenys de Munt és al Maresme\./)).toBeInTheDocument();
    expect(fetchEventsCached).toHaveBeenCalledWith(expect.objectContaining({ place: "maresme" }));
    expect(screen.getByTestId("region-events")).toHaveTextContent("r1,r2");
    expect(screen.getByTestId("region-events")).toHaveAttribute("data-title", "Més plans al Maresme");
  });

  it("skips comarca events when the town has enough of its own", async () => {
    render(await TownGuide({ ...props, events: [event("1")], totalEvents: 20 }));

    expect(fetchEventsCached).not.toHaveBeenCalled();
    expect(screen.queryByTestId("region-events")).not.toBeInTheDocument();
  });

  it("skips comarca events when the list is already the comarca fallback", async () => {
    render(await TownGuide({ ...props, events: [event("r1")], totalEvents: 0 }));

    expect(fetchEventsCached).not.toHaveBeenCalled();
    expect(screen.getByText(/no hi ha activitats programades/)).toBeInTheDocument();
  });
});
