import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { EventSummaryResponseDTO } from "types/api/event";
import CardContentClient from "@components/ui/common/cardContent/CardContentClient";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt} data-testid="mock-image" />
  ),
}));

describe("favorites heart visibility", () => {
  const baseEvent: EventSummaryResponseDTO = {
    id: "1",
    hash: "h",
    slug: "test-event",
    title: "Test",
    type: "FREE",
    url: "https://example.com",
    description: "d",
    imageUrl: "",
    startDate: "2020-01-01",
    startTime: null,
    endDate: "2020-01-02",
    endTime: null,
    location: "Barcelona",
    visits: 0,
    origin: "MANUAL",
    categories: [],
  };

  it("shows the heart button when event has a slug (not favorited)", async () => {
    render(
      <CardContentClient
        event={baseEvent}
        isPriority={false}
        isHorizontal={false}
        initialIsFavorite={false}
      />
    );

    expect(screen.getByRole("button", { name: /preferits/i })).toBeVisible();
  });

  it("shows the heart button when event has a slug (already favorited)", async () => {
    render(
      <CardContentClient
        event={baseEvent}
        isPriority={false}
        isHorizontal={false}
        initialIsFavorite={true}
      />
    );

    expect(screen.getByRole("button", { name: /preferits/i })).toBeVisible();
  });

  it("hides the heart button when event has no slug", async () => {
    render(
      <CardContentClient
        event={{ ...baseEvent, slug: "" }}
        isPriority={false}
        isHorizontal={false}
        initialIsFavorite={false}
      />
    );

    expect(
      screen.queryByRole("button", { name: /preferits/i })
    ).not.toBeInTheDocument();
  });
});
