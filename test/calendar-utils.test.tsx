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

  it("generateCalendarUrls falls back to the start date when endDate is null", () => {
    const urls = generateCalendarUrls({
      title: "Presentació del llibre",
      description: "Presentació del llibre 'Entendre els mapes'",
      location: "Altafulla",
      startDate: "2026-07-27T00:00:00.000Z",
      endDate: null,
      canonical: "https://www.esdeveniments.cat/e/presentacio",
      labels: {
        moreInfoHtml: "More info: {url}",
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    const googleParams = new URL(urls.google).searchParams;
    const outlookParams = new URL(urls.outlook).searchParams;
    const decodedIcal = decodeURIComponent(urls.ical);

    expect(googleParams.get("dates")).toBe(
      "20260727T000000Z/20260727T000000Z"
    );
    expect(outlookParams.get("enddt")).toBe("20260727T000000Z");
    expect(decodedIcal).toContain("DTEND:20260727T000000Z");
    expect(urls.google).not.toContain("19700101");
  });

  it("generateCalendarUrls parses whitespace-padded ISO date strings", () => {
    const urls = generateCalendarUrls({
      title: "Presentació del llibre",
      description: "Presentació del llibre 'Entendre els mapes'",
      location: "Altafulla",
      startDate: " 2026-07-27T00:00:00.000Z ",
      endDate: " 2026-07-27T01:00:00.000Z ",
      canonical: "https://www.esdeveniments.cat/e/presentacio",
      labels: {
        moreInfoHtml: "More info: {url}",
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    expect(new URL(urls.google).searchParams.get("dates")).toBe(
      "20260727T000000Z/20260727T010000Z"
    );
  });

  it("generateCalendarUrls ignores non-date runtime endDate values", () => {
    const urls = generateCalendarUrls({
      title: "Presentació del llibre",
      description: "Presentació del llibre 'Entendre els mapes'",
      location: "Altafulla",
      startDate: "2026-07-27T00:00:00.000Z",
      endDate: 0 as unknown as Date,
      canonical: "https://www.esdeveniments.cat/e/presentacio",
      labels: {
        moreInfoHtml: "More info: {url}",
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    expect(new URL(urls.google).searchParams.get("dates")).toBe(
      "20260727T000000Z/20260727T000000Z"
    );
    expect(urls.google).not.toContain("19700101");
  });

  it("generateCalendarUrls falls back when endDate is before startDate", () => {
    const urls = generateCalendarUrls({
      title: "Presentació del llibre",
      description: "Presentació del llibre 'Entendre els mapes'",
      location: "Altafulla",
      startDate: "2026-07-27T00:00:00.000Z",
      endDate: "1970-01-01T00:00:00.000Z",
      canonical: "https://www.esdeveniments.cat/e/presentacio",
      labels: {
        moreInfoHtml: "More info: {url}",
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    expect(new URL(urls.google).searchParams.get("dates")).toBe(
      "20260727T000000Z/20260727T000000Z"
    );
    expect(urls.google).not.toContain("19700101");
  });

  it("generateCalendarUrls returns empty URLs for invalid startDate values", () => {
    const urls = generateCalendarUrls({
      title: "Presentació del llibre",
      description: "Presentació del llibre 'Entendre els mapes'",
      location: "Altafulla",
      startDate: "not-a-date",
      endDate: "2026-07-27T00:00:00.000Z",
      canonical: "https://www.esdeveniments.cat/e/presentacio",
      labels: {
        moreInfoHtml: "More info: {url}",
        moreInfoText: "More info: {url}",
        dateRange: "From {start} to {end}",
        dateSingle: "From {start}",
      },
    });

    expect(urls).toEqual({ google: "", outlook: "", ical: "" });
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
