import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EventCalendar from "app/[locale]/e/[eventId]/components/EventCalendar";
import type { EventDetailResponseDTO } from "types/api/event";

vi.mock("@components/ui/addToCalendar", () => ({ default: () => null }));

const event = {
  id: "event-1",
  slug: "concert",
  title: "Concert",
  description: "",
  location: "Plaça Major",
  startDate: "2026-11-20",
  endDate: "2026-11-20",
  startTime: "20:00",
  endTime: null,
  city: { name: "Vic", postalCode: "08500" },
  region: { name: "Osona" },
} as unknown as EventDetailResponseDTO;

const renderCalendar = async (price: string | null | undefined) =>
  render(await EventCalendar({ event: { ...event, price }, compact: true }));

describe("EventCalendar price row", () => {
  it("shows the backend price text under a translated label", async () => {
    await renderCalendar("10 € taquilla · 5 € online");

    expect(screen.getByTestId("event-price").textContent).toBe(
      "Preu: 10 € taquilla · 5 € online"
    );
  });

  it("translates a plain free price", async () => {
    await renderCalendar("gratis");

    expect(screen.getByTestId("event-price").textContent).toBe("Preu: Gratuït");
  });

  it.each([
    ["0", /^Preu: Gratuït$/],
    ["10", /^Preu: 10\s€$/],
    ["12.5", /^Preu: 12,50\s€$/],
  ])("formats the form amount %j in euros", async (price, expected) => {
    await renderCalendar(price);

    expect(screen.getByTestId("event-price").textContent).toMatch(expected);
  });

  it.each([null, undefined, "  "])("hides the row when the price is %j", async (price) => {
    await renderCalendar(price);

    expect(screen.queryByTestId("event-price")).toBeNull();
  });
});
