import { describe, it, expect, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import CommunityStrip from "@components/ui/common/social/CommunityStrip";
import HybridEventsList from "@components/ui/hybridEventsList";
import List from "@components/ui/list";
import { socialLinks } from "@config/index";
import type { ListEvent } from "types/api/event";

vi.mock("@components/ui/sponsor/SponsorBannerSlot", () => ({ default: () => null }));

function findComponentProps(
  node: ReactNode,
  target: unknown,
): Record<string, unknown> | undefined {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findComponentProps(child, target);
      if (found) return found;
    }
    return undefined;
  }
  const el = node as ReactElement<
    Record<string, unknown> & { children?: ReactNode; inlineSlot?: ReactNode }
  >;
  if (el.type === target) return el.props;
  return (
    findComponentProps(el.props?.inlineSlot, target) ??
    findComponentProps(el.props?.children, target)
  );
}

describe("CommunityStrip", () => {
  it("renders WhatsApp Channel and Instagram primaries plus progressive-disclosure networks", async () => {
    const ui = await CommunityStrip({
      locale: "ca",
      context: "event_inline",
      placeSlug: "barcelona",
    });
    const { container } = render(ui);

    const section = screen.getByTestId("community-strip");
    expect(section).toHaveAttribute("data-community-mode", "follow");

    const whatsappLink = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsappLink).toHaveAttribute("href", socialLinks.whatsapp);
    expect(whatsappLink).toHaveAttribute(
      "data-analytics-event-name",
      "community_strip_click",
    );
    expect(whatsappLink).toHaveAttribute("data-analytics-context", "event_inline");
    expect(whatsappLink).toHaveAttribute("data-analytics-target", "whatsapp");
    expect(whatsappLink).toHaveAttribute("data-analytics-place-slug", "barcelona");
    expect(whatsappLink).not.toHaveAttribute("data-analytics-source");

    const instagramLink = screen.getByRole("link", { name: /instagram/i });
    expect(instagramLink).toHaveAttribute("href", socialLinks.instagram);

    const details = container.querySelector("details");
    expect(details).toBeTruthy();

    const blueskyLink = screen.getByRole("link", { name: "Bluesky" });
    expect(blueskyLink).toHaveAttribute("href", socialLinks.bluesky);

    const mastodonLink = screen.getByRole("link", { name: "Mastodon" });
    expect(mastodonLink).toHaveAttribute("rel", "me noopener noreferrer");
  });

  it("renders the thin-town organizer CTA with contracted Catalan place preposition", async () => {
    const ui = await CommunityStrip({
      locale: "ca",
      context: "thin_town_inline",
      placeSlug: "el-masnou",
      placeLabel: "El Masnou",
      placeType: "town",
    });
    render(ui);

    const section = screen.getByTestId("community-strip");
    expect(section).toHaveAttribute("data-community-mode", "thin-town");
    expect(screen.getByText(/al Masnou/i)).toBeInTheDocument();

    const publishLink = screen.getByRole("link");
    expect(publishLink).toHaveAttribute("href", "/publica");
    expect(publishLink).toHaveAttribute("data-analytics-target", "publish");
    expect(publishLink).toHaveAttribute("data-analytics-context", "thin_town_inline");
  });

  it("falls back to follow mode when thin_town_inline has no placeLabel", async () => {
    const ui = await CommunityStrip({
      locale: "ca",
      context: "thin_town_inline",
      placeSlug: "terrassa",
    });
    render(ui);

    expect(screen.getByTestId("community-strip")).toHaveAttribute(
      "data-community-mode",
      "follow",
    );
  });
});

describe("HybridEventsList CommunityStrip selection", () => {
  const makeEvents = (count: number): ListEvent[] =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      hash: `h${i}`,
      slug: `event-${i}`,
      title: `Event ${i}`,
      imageUrl: null,
    })) as ListEvent[];

  it("uses thin_town_inline on an unfiltered town with 1–4 events", async () => {
    const tree = await HybridEventsList({
      initialEvents: makeEvents(3),
      place: "terrassa",
      placeTypeLabel: { type: "town", label: "Terrassa" },
      serverHasMore: false,
    });

    const props = findComponentProps(tree, CommunityStrip);
    expect(props?.context).toBe("thin_town_inline");
    expect(props?.placeLabel).toBe("Terrassa");
  });

  it("uses listing_inline when a town listing is filtered by date or category", async () => {
    const tree = await HybridEventsList({
      initialEvents: makeEvents(2),
      place: "barcelona",
      date: "avui",
      placeTypeLabel: { type: "town", label: "Barcelona" },
      serverHasMore: false,
    });

    const props = findComponentProps(tree, CommunityStrip);
    expect(props?.context).toBe("listing_inline");
  });

  it("uses listing_inline when a town has 5 or more events", async () => {
    const tree = await HybridEventsList({
      initialEvents: makeEvents(5),
      place: "girona",
      placeTypeLabel: { type: "town", label: "Girona" },
      serverHasMore: false,
    });

    const props = findComponentProps(tree, CommunityStrip);
    expect(props?.context).toBe("listing_inline");
  });

  it("omits CommunityStrip on profile pages", async () => {
    const tree = await HybridEventsList({
      initialEvents: makeEvents(2),
      place: "catalunya",
      profileSlug: "ajuntament-cardedeu",
    });

    expect(findComponentProps(tree, CommunityStrip)).toBeUndefined();
  });

  it("inserts List inlineSlot between cards at the target index and clamps for short lists", () => {
    const { container } = render(
      <List
        events={makeEvents(10)}
        inlineSlot={<div data-testid="slot">Strip</div>}
        inlineSlotAfterIndex={6}
      >
        {(ev) => <span>{String("title" in ev ? ev.title : "ad")}</span>}
      </List>,
    );
    const items = Array.from(container.querySelectorAll("ul > li"));
    expect(items).toHaveLength(11);
    expect(items[7].querySelector('[data-testid="slot"]')).toBeTruthy();

    const { container: shortContainer } = render(
      <List
        events={makeEvents(3)}
        inlineSlot={<div data-testid="short-slot">Strip</div>}
        inlineSlotAfterIndex={6}
      >
        {(ev) => <span>{String("title" in ev ? ev.title : "ad")}</span>}
      </List>,
    );
    const shortItems = Array.from(shortContainer.querySelectorAll("ul > li"));
    expect(shortItems).toHaveLength(4);
    expect(shortItems[3].querySelector('[data-testid="short-slot"]')).toBeTruthy();
  });
});
