import { describe, it, expect } from "vitest";
import type { PlaceTypeAndLabel } from "types/common";
import type { PlacePageShellProps } from "types/props";
import { ClientLayerWithPlaceLabel } from "components/partials/PlacePageShell";

const mockPageData = {
  metaTitle: "title",
  metaDescription: "desc",
  title: "Title",
  subTitle: "Subtitle",
  canonical: "https://example.com",
  notFoundTitle: "Not found",
  notFoundDescription: "Missing",
};

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

    expect(element.props.placeTypeLabel).toEqual(placeTypeLabel);
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

    expect(element.props.categories).toEqual(categories);
  });
});
