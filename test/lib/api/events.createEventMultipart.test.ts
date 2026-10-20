// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildCreateEventFormData } from "@lib/api/events";
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
