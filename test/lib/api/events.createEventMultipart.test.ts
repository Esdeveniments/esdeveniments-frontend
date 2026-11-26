// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCaptureException, mockFetchWithHmac, mockGetValidAccessToken } =
  vi.hoisted(() => ({
    mockCaptureException: vi.fn(),
    mockFetchWithHmac: vi.fn(),
    mockGetValidAccessToken: vi.fn(),
  }));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

vi.mock("@lib/api/fetch-wrapper", () => ({
  fetchWithHmac: mockFetchWithHmac,
}));

vi.mock("@utils/auth-cookies", () => ({
  getValidAccessToken: mockGetValidAccessToken,
}));

import { buildCreateEventFormData, createEvent } from "@lib/api/events";
import type { EventCreateRequestDTO } from "types/api/event";

const data: EventCreateRequestDTO = {
  title: "Concert",
  url: null,
  description: "Desc",
  regionId: 1,
  cityId: 2,
  startDate: "2026-11-01",
  startTime: "18:00",
  endDate: "2026-11-01",
  endTime: "20:00",
  location: "Plaça Major",
  categories: [],
  price: null,
};

describe("buildCreateEventFormData", () => {
  it("serializes the event part as application/json on the wire", async () => {
    const body = await new Response(buildCreateEventFormData(data)).text();

    expect(body).toMatch(
      /name="event"[^\r\n]*\r\nContent-Type: application\/json\r\n\r\n\{"title":"Concert"/,
    );
    expect(body).not.toContain('name="imageFile"');
  });

  it("adds the image as the imageFile part when given", async () => {
    const image = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    const body = await new Response(buildCreateEventFormData(data, image)).text();

    expect(body).toMatch(/name="imageFile"; filename="cover.png"\r\nContent-Type: image\/png/);
  });
});

describe("createEvent Sentry publish_alert tagging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";
    mockGetValidAccessToken.mockResolvedValue("header.payload.sig");
  });

  it("tags 5xx responses as immediate and 400 validation errors as spike", async () => {
    mockFetchWithHmac.mockResolvedValueOnce(
      new Response("internal failure", { status: 500 }),
    );
    await expect(createEvent(data)).rejects.toMatchObject({ status: 500 });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "createEvent: HTTP 500" }),
      expect.objectContaining({
        tags: expect.objectContaining({
          httpStatus: "500",
          publish_alert: "immediate",
        }),
      }),
    );

    mockCaptureException.mockClear();
    mockFetchWithHmac.mockResolvedValueOnce(
      new Response("validation error", { status: 400 }),
    );
    await expect(createEvent(data)).rejects.toMatchObject({ status: 400 });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "createEvent: HTTP 400" }),
      expect.objectContaining({
        tags: expect.objectContaining({
          httpStatus: "400",
          publish_alert: "spike",
        }),
      }),
    );
  });

  it("omits publish_alert on 401/403 so createEventAction is the single immediate alert", async () => {
    mockFetchWithHmac.mockResolvedValueOnce(
      new Response("forbidden", { status: 403 }),
    );
    await expect(createEvent(data)).rejects.toMatchObject({ status: 403 });

    const [, context] = mockCaptureException.mock.calls[0] ?? [];
    const tags = (context as { tags?: Record<string, string> })?.tags;
    expect(tags).toMatchObject({ httpStatus: "403" });
    expect(tags?.publish_alert).toBeUndefined();
  });

  it("marks missing local session token errors with authSource: session without capturing", async () => {
    mockGetValidAccessToken.mockResolvedValueOnce(null);

    await expect(createEvent(data)).rejects.toMatchObject({
      status: 401,
      authSource: "session",
    });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("captures immediate publish alerts on network throws and invalid JSON responses", async () => {
    mockFetchWithHmac.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(createEvent(data)).rejects.toThrow("connect ECONNREFUSED");
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          failureKind: "network",
          publish_alert: "immediate",
        }),
      }),
    );

    mockCaptureException.mockClear();
    mockFetchWithHmac.mockResolvedValueOnce(
      new Response("<html>502</html>", { status: 200 }),
    );
    await expect(createEvent(data)).rejects.toThrow();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          failureKind: "invalid-json",
          publish_alert: "immediate",
        }),
      }),
    );
  });
});
