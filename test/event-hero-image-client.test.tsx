import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import EventHeroImageClient from "app/[locale]/e/[eventId]/components/EventHeroImageClient";

const ORIGINAL = "https://fitxers.example.cat/agenda/concert.jpg";
const SOURCES = {
  fallback: `/api/image-proxy?url=${encodeURIComponent(ORIGINAL)}&w=1200`,
  webp: `/api/image-proxy?url=${encodeURIComponent(ORIGINAL)}&w=1200&format=webp`,
  webpSrcSet: `/api/image-proxy?url=${encodeURIComponent(ORIGINAL)}&w=1200&format=webp 1200w`,
};

function renderHero() {
  return render(
    <EventHeroImageClient sources={SOURCES} directSrc={ORIGINAL} safeTitle="Concert" title="Concert" />,
  );
}

describe("EventHeroImageClient when the proxy can't fetch the image", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads the original without a Referer, and the proxied image with one", () => {
    const { container } = renderHero();
    const proxied = container.querySelectorAll("img");
    proxied.forEach((img) => expect(img.hasAttribute("referrerpolicy")).toBe(false));

    fireEvent.error(proxied[1]);

    const direct = container.querySelectorAll("img");
    expect(direct).toHaveLength(2);
    direct.forEach((img) => {
      expect(img.getAttribute("src")).toBe(ORIGINAL);
      expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
    });
  });

  // The hero loads eagerly, so its `error` can fire before React listens.
  it("loads the original when the proxied image failed before hydration", () => {
    const proto = HTMLImageElement.prototype;
    vi.spyOn(proto, "complete", "get").mockReturnValue(true);
    vi.spyOn(proto, "naturalWidth", "get").mockReturnValue(0);
    vi.spyOn(proto, "currentSrc", "get").mockReturnValue(SOURCES.webp);

    const { container } = renderHero();

    expect(container.querySelector("img")?.getAttribute("src")).toBe(ORIGINAL);
  });
});
