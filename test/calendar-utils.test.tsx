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
      labels: {
        moreInfoHtml:
          'More info: <a href="{url}" target="_blank" rel="noopener noreferrer">Esdeveniments.cat</a>',
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
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
    const decodedIcs = decodeURIComponent(
      urls.ical.replace("data:text/calendar;charset=utf8,", "")
    );
    expect(decodedIcs).toContain("BEGIN:VCALENDAR");
    expect(decodedIcs).toContain("BEGIN:VEVENT");
    expect(decodedIcs).toContain("UID:");
    expect(decodedIcs).toContain("DTSTAMP:");
    expect(decodedIcs).toContain("SUMMARY:Castellers a plaça");
    expect(decodedIcs).not.toContain("BEGIN=VCALENDAR");
  });

  it("strips CRLF from the iCal URL property", () => {
    const urls = generateCalendarUrls({
      title: "Castellers a plaça",
      description: "Actuació de colles castelleres",
      location: "Plaça Catalunya, Barcelona",
      startDate: "2025-06-21T10:00:00",
      endDate: "2025-06-21T12:00:00",
      canonical: "https://www.esdeveniments.cat/e/castellers\r\nX-EVIL:YES",
      labels: {
        moreInfoHtml:
          'More info: <a href="{url}" target="_blank" rel="noopener noreferrer">Esdeveniments.cat</a>',
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    const decodedIcs = decodeURIComponent(
      urls.ical.replace("data:text/calendar;charset=utf8,", "")
    );

    expect(decodedIcs).not.toContain("\r\nX-EVIL:YES");
    expect(decodedIcs).not.toContain("\nX-EVIL:YES");
  });

  it("formatEventDateRange returns string and jsx in expected shape", () => {
    const labels = {
      dateRange: "From {start} to {end}",
      dateSingle: "From {start}",
    };
    const single = formatEventDateRange(
      "2025-06-21T10:00:00",
      undefined,
      labels
    );
    expect(single.string).toBe("From 2025-06-21T10:00:00");

    const range = formatEventDateRange(
      "2025-06-21T10:00:00",
      "2025-06-21T12:00:00",
      labels
    );
    expect(range.string).toBe(
      "From 2025-06-21T10:00:00 to 2025-06-21T12:00:00"
    );
  });
});
