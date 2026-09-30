import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventDetailResponseDTO } from "types/api/event";

const mockCreatePromotionCheckout = vi.fn();
const mockFetchEventBySlug = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock("@lib/api/events", () => ({
  createPromotionCheckout: (id: string, successUrl: string, cancelUrl: string) =>
    mockCreatePromotionCheckout(id, successUrl, cancelUrl),
  fetchEventBySlug: (slug: string) => mockFetchEventBySlug(slug),
}));

vi.mock("@lib/auth/session", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

import { createPromotionCheckoutAction } from "../app/[locale]/e/[eventId]/promote/actions";

const CREATOR_ID = "creator-uuid-1";

function buildEvent(overrides: Partial<EventDetailResponseDTO> = {}): EventDetailResponseDTO {
  return {
    id: "event-uuid-1",
    hash: "hash",
    slug: "my-event",
    title: "My Event",
    type: "FREE",
    url: "",
    description: "desc",
    imageUrl: "",
    startDate: "2026-09-01",
    startTime: null,
    endDate: "2026-09-01",
    endTime: null,
    location: "Location",
    visits: 0,
    origin: "MANUAL",
    owner: {
      id: CREATOR_ID,
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
      organizerVerified: false,
    },
    city: { id: 1, name: "City", slug: "city", latitude: 0, longitude: 0, postalCode: "08001", rssFeed: null, enabled: true },
    region: { id: 1, name: "Region", slug: "region" },
    province: { id: 1, name: "Region", slug: "region" },
    categories: [],
    ...overrides,
  };
}

describe("createPromotionCheckoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the checkout url when the caller owns the event", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });
    mockCreatePromotionCheckout.mockResolvedValue({
      url: "https://checkout.stripe.com/session123",
    });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: true,
      url: "https://checkout.stripe.com/session123",
    });
    expect(mockCreatePromotionCheckout).toHaveBeenCalledWith(
      "event-uuid-1",
      expect.stringContaining("/e/my-event/promote/success"),
      expect.stringContaining("/e/my-event/promote/cancel"),
    );
  });

  it("rejects when the provided eventId does not match the resolved event's id", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent({ id: "different-uuid" }));
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });
    expect(mockCreatePromotionCheckout).not.toHaveBeenCalled();
  });

  it("rejects when the signed-in user does not own the event", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: "someone-else" });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Unauthorized: only the event creator can promote this event",
    });
  });

  it("rejects when the event does not exist", async () => {
    mockFetchEventBySlug.mockResolvedValue(null);
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({ success: false, error: "Event not found" });
  });

  it("converts a thrown backend error into a generic result instead of throwing", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });
    mockCreatePromotionCheckout.mockRejectedValue(new Error("HTTP error! status: 404"));

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });

  it("returns a distinct stale-session result on a tagged 401 from requireMutationAuth", async () => {
    mockFetchEventBySlug.mockResolvedValue(buildEvent());
    mockGetCurrentUser.mockResolvedValue({ id: CREATOR_ID });
    const authError = new Error("Authentication required");
    (authError as Error & { status: number }).status = 401;
    mockCreatePromotionCheckout.mockRejectedValue(authError);

    const result = await createPromotionCheckoutAction(
      "event-uuid-1",
      "my-event",
      "ca",
    );

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Please sign in again.",
      reason: "stale-session",
    });
  });
});
