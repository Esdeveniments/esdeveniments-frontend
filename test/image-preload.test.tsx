import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { EventSummaryResponseDTO } from "types/api/event";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";

const { preloadMock } = vi.hoisted(() => ({
  preloadMock: vi.fn(),
}));

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: preloadMock,
}));

import ImagePreload from "@components/ui/common/image/ImagePreload";
import CardImagePreload from "@components/ui/common/image/CardImagePreload";

const sampleUrl = "https://example.com/poster.jpg";

describe("ImagePreload", () => {
  test("calls ReactDOM.preload with matching ImageServer sources and sizes", () => {
    preloadMock.mockClear();
    const html = renderToString(
      <ImagePreload image={sampleUrl} context="featured" cacheKey="v1" />,
    );

    const expected = buildResponsivePictureSourceUrls(
      sampleUrl,
      "v1",
      { quality: getOptimalImageQuality({ isPriority: true, isExternal: true }) },
      getResponsiveWidths("featured"),
    );

    expect(html).toBe("");
    expect(preloadMock).toHaveBeenCalledTimes(1);
    expect(preloadMock).toHaveBeenCalledWith(expected.webp, {
      as: "image",
      imageSrcSet: expected.webpSrcSet,
      imageSizes: getOptimalImageSizes("featured"),
      type: "image/webp",
      fetchPriority: "high",
    });
  });

  test("skips preload when image URL is empty or whitespace", () => {
    preloadMock.mockClear();
    expect(renderToString(<ImagePreload image="" context="hero" />)).toBe("");
    expect(renderToString(<ImagePreload image="   " context="hero" />)).toBe("");
    expect(preloadMock).not.toHaveBeenCalled();
  });
});

describe("CardImagePreload", () => {
  test("preloads the first card with an image using list context and cache key", () => {
    preloadMock.mockClear();
    const events = [
      {
        id: "1",
        slug: "no-image",
        title: "No image",
        type: "FREE",
        isAd: false,
        imageUrl: "",
        updatedAt: "2026-01-01",
      },
      {
        id: "2",
        slug: "first-with-image",
        title: "First with image",
        type: "FREE",
        isAd: false,
        imageUrl: sampleUrl,
        hash: "abc123",
        updatedAt: "2026-01-02",
      },
      {
        id: "3",
        slug: "second-with-image",
        title: "Second with image",
        type: "FREE",
        isAd: false,
        imageUrl: "https://example.com/other.jpg",
        updatedAt: "2026-01-03",
      },
    ] as unknown as EventSummaryResponseDTO[];

    renderToString(<CardImagePreload events={events} />);

    const expected = buildResponsivePictureSourceUrls(
      sampleUrl,
      "abc123",
      { quality: getOptimalImageQuality({ isPriority: true, isExternal: true }) },
      getResponsiveWidths("list"),
    );

    expect(preloadMock).toHaveBeenCalledTimes(1);
    expect(preloadMock).toHaveBeenCalledWith(expected.webp, {
      as: "image",
      imageSrcSet: expected.webpSrcSet,
      imageSizes: getOptimalImageSizes("list"),
      type: "image/webp",
      fetchPriority: "high",
    });
  });
});
