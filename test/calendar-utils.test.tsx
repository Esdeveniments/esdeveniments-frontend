import { describe, it, expect } from "vitest";
import {
  generateCalendarUrls,
  formatEventDateRange,
} from "../utils/calendarUtils";

describe("calendar utils (black-box)", () => {
  it("generateCalendarUrls returns valid provider URLs with encoded params", () => {
    const urls = generateCalendarUrls({
      title: "Castellers a plaça",
      description: "Actuació de colles castelleres",
      location: "Plaça Catalunya, Barcelona",
      startDate: "2025-06-21T10:00:00",
      endDate: "2025-06-21T12:00:00",
      canonical: "https://www.esdeveniments.cat/e/castellers",
    });

    expect(urls.google).toContain("https://www.google.com/calendar/render?");
    expect(urls.google).toContain("action=TEMPLATE");
    expect(urls.google).toContain("text=Castellers%20a%20pla%C3%A7a");
    expect(urls.google).toContain("details=");
    expect(urls.google).toContain(
      "location=Pla%C3%A7a%20Catalunya%2C%20Barcelona"
    );

    expect(urls.outlook).toContain("https://outlook.live.com/owa/?");
    expect(urls.outlook).toContain("subject=Castellers%20a%20pla%C3%A7a");
    expect(urls.outlook).toContain(
      "location=Pla%C3%A7a%20Catalunya%2C%20Barcelona"
    );

    expect(urls.ical.startsWith("data:text/calendar;charset=utf8,")).toBe(true);
  });

  it("formatEventDateRange returns string and jsx in expected shape", () => {
    const single = formatEventDateRange("2025-06-21T10:00:00");
    expect(single.string).toBe("2025-06-21T10:00:00");

    const range = formatEventDateRange(
      "2025-06-21T10:00:00",
      "2025-06-21T12:00:00"
    );
    expect(range.string).toContain(
      "Del 2025-06-21T10:00:00 al 2025-06-21T12:00:00"
    );
  });
});
