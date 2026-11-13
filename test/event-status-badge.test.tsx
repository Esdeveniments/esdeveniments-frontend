import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventStatusBadge from "app/[locale]/e/[eventId]/components/EventStatusBadge";

describe("EventStatusBadge", () => {
  it("shows only the countdown for an upcoming event, so it fits next to the actions", () => {
    render(
      <EventStatusBadge
        status={{ state: "upcoming", label: "Properament", startsIn: "Comença en 3 hores" }}
      />,
    );
    const badge = screen.getByLabelText("Estat: Properament — Comença en 3 hores");
    expect(badge.textContent).toBe("Comença en 3\u00A0hores");
  });

  it("keeps the number with its unit, so a wrap never leaves the unit alone", () => {
    render(
      <EventStatusBadge
        status={{ state: "upcoming", label: "Upcoming", startsIn: "Starts in 180 days" }}
      />,
    );
    expect(screen.getByLabelText(/^Estat: Upcoming/).textContent).toBe("Starts in 180\u00A0days");
  });

  it("shows the label for an upcoming event with no countdown", () => {
    render(<EventStatusBadge status={{ state: "upcoming", label: "Properament" }} />);
    expect(screen.getByLabelText("Estat: Properament").textContent).toBe("Properament");
  });

  it("keeps each part of a live badge on one line so the countdown wraps whole", () => {
    render(
      <EventStatusBadge
        status={{ state: "live", label: "En curs", endsIn: "Acaba en 3 hores" }}
      />,
    );
    const parts = [...screen.getByLabelText(/^Estat: En curs/).children];
    expect(parts.map((p) => p.textContent)).toEqual(["En curs", "Acaba en 3\u00A0hores"]);
    for (const part of parts) expect(part.className).toContain("whitespace-nowrap");
  });
});
