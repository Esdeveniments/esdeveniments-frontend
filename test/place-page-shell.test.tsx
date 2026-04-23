import { describe, it, expect } from "vitest";
import type { PlaceTypeAndLabel } from "types/common";
import type { PlacePageShellProps } from "types/props";
import { ClientLayerWithPlaceLabel } from "components/partials/PlacePageShell";
import type { ReactElement } from "react";

const mockPageData = {
  metaTitle: "title",
  metaDescription: "desc",
  title: "Title",
  subTitle: "Subtitle",
  canonical: "https://example.com",
  notFoundTitle: "Not found",
  notFoundDescription: "Missing",
};

/**
 * ClientLayerWithPlaceLabel wraps LazyClientInteractiveLayer in
 * FilterLoadingProvider > UrlFiltersProvider > Suspense.
 * Drill through to the leaf to inspect its props.
 */
function getLeafProps(element: ReactElement): Record<string, unknown> {
  let current: ReactElement = element;
  let props = current.props as Record<string, unknown>;
  while (props.children) {
    const child = props.children;
    current = Array.isArray(child) ? child[0] : (child as ReactElement);
    props = current.props as Record<string, unknown>;
  }
  return props;
}

describe("PlacePageShell client layer", () => {
  it("passes placeTypeLabel from shellDataPromise to ClientInteractiveLayer", async () => {
    const placeTypeLabel: PlaceTypeAndLabel = { type: "town", label: "Barcelona" };

    const shellDataPromise: PlacePageShellProps["shellDataPromise"] = Promise.resolve({
      placeTypeLabel,
      pageData: mockPageData,
    });

    const element = await ClientLayerWithPlaceLabel({
      shellDataPromise,
      categories: [],
    });

    expect(getLeafProps(element).placeTypeLabel).toEqual(placeTypeLabel);
  });

  it("passes categories through to ClientInteractiveLayer", async () => {
    const placeTypeLabel: PlaceTypeAndLabel = { type: "region", label: "Catalunya" };
    const categories = [{ id: 1, name: "Music", slug: "music" }];

    const shellDataPromise: PlacePageShellProps["shellDataPromise"] = Promise.resolve({
      placeTypeLabel,
      pageData: mockPageData,
    });

    const element = await ClientLayerWithPlaceLabel({
      shellDataPromise,
      categories,
    });

    expect(getLeafProps(element).categories).toEqual(categories);
  });
});
