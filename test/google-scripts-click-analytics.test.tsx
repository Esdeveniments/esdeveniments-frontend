import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@lib/context/AdContext", () => ({ ADS_SCRIPT_SETTLED_EVENT: "ads-script-settled" }));

type GtagCall = [string, string, Record<string, unknown>];

async function setup() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS", "G-TEST");
  const gtag = vi.fn();
  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
  const GoogleScriptsHeavy = (await import("../app/GoogleScriptsHeavy")).default;
  render(<GoogleScriptsHeavy adsAllowed={true} adsScriptReady={false} />);
  return () => (gtag.mock.calls as GtagCall[]).filter(([cmd]) => cmd === "event");
}

describe("GoogleScriptsHeavy click analytics", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("keeps the listing's place and category and adds the clicked event's own", async () => {
    const events = await setup();
    const { getByText } = render(
      <div
        data-analytics-container="true"
        data-analytics-place-slug="barcelona"
        data-analytics-category-slug="concerts"
      >
        <a
          href="#card"
          data-analytics-event-name="select_event"
          data-analytics-event-category-slug="teatre"
          data-analytics-event-place-slug="badalona"
          data-analytics-position="4"
        >
          Card
        </a>
      </div>,
    );

    fireEvent.click(getByText("Card"));

    expect(events()).toContainEqual([
      "event",
      "select_event",
      expect.objectContaining({
        place_slug: "barcelona",
        category_slug: "concerts",
        event_place_slug: "badalona",
        event_category_slug: "teatre",
        position: 4,
      }),
    ]);
  });

  it("forwards event category and place slugs on outbound ticket clicks", async () => {
    const events = await setup();
    const { getByText } = render(
      <a
        href="https://tickets.example.com/buy"
        data-analytics-link-type="sidebar_visit_website"
        data-analytics-context="event_sidebar"
        data-analytics-event-id="99"
        data-analytics-event-slug="concert-girona"
        data-analytics-category-slug="musica"
        data-analytics-place-slug="girona"
      >
        Tickets
      </a>,
    );

    fireEvent.click(getByText("Tickets"));

    expect(events()).toContainEqual([
      "event",
      "outbound_click",
      expect.objectContaining({
        link_type: "sidebar_visit_website",
        context: "event_sidebar",
        event_id: "99",
        event_slug: "concert-girona",
        category_slug: "musica",
        place_slug: "girona",
      }),
    ]);
  });
});
