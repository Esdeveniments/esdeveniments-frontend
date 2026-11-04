import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import ClientCardsList from "@components/ui/hybridEventsList/ClientCardsList";
import { hasCardImage } from "@utils/event-helpers";
import ClientImage from "@components/ui/common/image/ClientImage";
import type { ListEvent } from "types/api/event";

vi.mock("@components/ui/imgDefault", () => ({ default: () => null }));
vi.mock("@components/ui/common/favoriteButton", () => ({ default: () => null }));

const event = (over: Partial<ListEvent>): ListEvent =>
  ({ id: "1", hash: "h", slug: "s", title: "t", imageUrl: null, ...over }) as ListEvent;

describe("hasCardImage", () => {
  it("skips ads and events without an image when picking the LCP card", () => {
    const events = [
      event({ id: "a" }),
      { isAd: true, id: "ad", imageUrl: "https://example.com/ad.jpg" } as ListEvent,
      event({ id: "b", imageUrl: "https://example.com/b.jpg" }),
    ];
    expect(events.findIndex(hasCardImage)).toBe(2);
  });

  it("returns -1 when no event has a usable image", () => {
    expect(
      [event({}), event({ id: "2", imageUrl: "   " })].findIndex(hasCardImage),
    ).toBe(-1);
  });

  it("gives eager loading only to the first card that has an image", () => {
    const { container } = render(
      <ClientCardsList
        events={[
          event({ id: "a" }),
          event({ id: "b", imageUrl: "https://example.com/b.jpg" }),
          event({ id: "c", imageUrl: "https://example.com/c.jpg" }),
        ]}
      />,
    );
    const loading = [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("loading"),
    );
    expect(loading).toEqual(["eager", "lazy"]);
  });
});

describe("ClientImage", () => {
  const props = { title: "Concert", image: "https://example.com/c.jpg" };

  it("renders the image visible in server HTML, without a JS fade", () => {
    const html = renderToString(<ClientImage {...props} />);
    expect(html).toContain("<img");
    expect(html).not.toMatch(/opacity:\s*0/);
    expect(html).not.toContain("animate-fast-pulse");
  });

  it("offers WebP and a fallback, no AVIF source", () => {
    const { container } = render(<ClientImage {...props} />);
    expect(container.querySelector('source[type="image/webp"]')).not.toBeNull();
    expect(container.querySelector('source[type="image/avif"]')).toBeNull();
  });

  it("loads the priority image eagerly with high fetch priority", () => {
    const { container } = render(<ClientImage {...props} priority />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });
});
