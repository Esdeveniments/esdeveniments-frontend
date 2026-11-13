import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventStatusBadge from "app/[locale]/e/[eventId]/components/EventStatusBadge";
import type { EventStatusMeta, EventTemporalStatus } from "types/event-status";

const renderBadge = (status: EventStatusMeta | EventTemporalStatus) => render(<EventStatusBadge status={status} />).container;
const visibleText = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(".sr-only").forEach((n) => n.remove());
  return copy.textContent;
};

describe("EventStatusBadge", () => {
  it("shows only the countdown for an upcoming event, so it fits next to the actions", () => {
    const pill = renderBadge({ state: "upcoming", label: "Properament", startsIn: "Comença en 3 hores" })
      .firstElementChild!;
    expect(visibleText(pill)).toBe("Comença en 3\u00A0hores");
    // Screen readers get the context as text, not as an aria-label on a span (not allowed by ARIA).
    expect(pill.textContent).toBe("Estat: Comença en 3\u00A0hores");
    expect(pill.hasAttribute("aria-label")).toBe(false);
  });

  it("keeps the number with its unit, so a wrap never leaves the unit alone", () => {
    const pill = renderBadge({ state: "upcoming", label: "Upcoming", startsIn: "Starts in 180 days" })
      .firstElementChild!;
    expect(visibleText(pill)).toBe("Starts in 180\u00A0days");
  });

  it("shows the label for an upcoming event with no countdown", () => {
    expect(visibleText(renderBadge({ state: "upcoming", label: "Properament" }))).toBe("Properament");
  });

  it("puts a live countdown beside the pill with a still dot, never a looping pulse", () => {
    const root = renderBadge({ state: "live", label: "En curs", endsIn: "Acaba en 3 hores" });
    const [pill, countdown] = [...root.firstElementChild!.children];
    expect(visibleText(pill)).toBe("En curs");
    expect(pill.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(countdown.textContent).toBe("Acaba en 3\u00A0hores");
    expect(countdown.className).toContain("whitespace-nowrap");
    expect(root.innerHTML).not.toContain("animate-");
  });
});
