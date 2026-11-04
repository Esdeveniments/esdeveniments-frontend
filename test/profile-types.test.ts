import { describe, it, expect } from "vitest";
import {
  parseProfileDetail,
  parseProfileSummary,
} from "../lib/validation/profile";

describe("lib/validation/profile (UserPublicResponseDTO alias)", () => {
  it("parses a valid user payload", () => {
    const input = {
      id: "uuid-1",
      name: "Gerard Rovellat",
      username: "gerard-rovellat",
    };

    const result = parseProfileDetail(input);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("uuid-1");
    expect(result?.name).toBe("Gerard Rovellat");
    expect(result?.username).toBe("gerard-rovellat");
  });

  it("rejects payloads missing username", () => {
    const result = parseProfileDetail({ id: "uuid-2", name: "Only Name" });
    expect(result).toBeNull();
  });

  it("rejects completely invalid input", () => {
    expect(parseProfileDetail("invalid")).toBeNull();
    expect(parseProfileSummary(null)).toBeNull();
  });

  it("parseProfileSummary mirrors parseProfileDetail", () => {
    const input = { id: "uuid-3", name: "X", username: "x" };
    // pictureUrl and createdAt are optional (undefined when absent from input).
    // toEqual ignores undefined properties, so this still passes.
    const result = parseProfileSummary(input);
    expect(result?.id).toBe("uuid-3");
    expect(result?.name).toBe("X");
    expect(result?.username).toBe("x");
    expect(result?.pictureUrl).toBeUndefined();
    expect(result?.createdAt).toBeUndefined();
  });

  // ── pictureUrl + createdAt (added to match backend OpenAPI contract) ──

  it("parses pictureUrl when present", () => {
    const result = parseProfileDetail({
      id: "uuid-4",
      name: "Test",
      username: "test",
      pictureUrl: "https://cdn.example.com/avatar.jpg",
    });
    expect(result?.pictureUrl).toBe("https://cdn.example.com/avatar.jpg");
  });

  it("converts null pictureUrl to undefined", () => {
    const result = parseProfileDetail({
      id: "uuid-5",
      name: "Test",
      username: "test",
      pictureUrl: null,
    });
    expect(result?.pictureUrl).toBeUndefined();
  });

  it("defaults pictureUrl to undefined when key is absent", () => {
    const result = parseProfileDetail({
      id: "uuid-6",
      name: "Test",
      username: "test",
    });
    expect(result?.pictureUrl).toBeUndefined();
  });

  it("parses createdAt when present", () => {
    const result = parseProfileDetail({
      id: "uuid-7",
      name: "Test",
      username: "test",
      createdAt: "2025-03-15T10:30:00Z",
    });
    expect(result?.createdAt).toBe("2025-03-15T10:30:00Z");
  });

  it("converts null createdAt to undefined", () => {
    const result = parseProfileDetail({
      id: "uuid-8",
      name: "Test",
      username: "test",
      createdAt: null,
    });
    expect(result?.createdAt).toBeUndefined();
  });

  it("defaults createdAt to undefined when key is absent", () => {
    const result = parseProfileDetail({
      id: "uuid-9",
      name: "Test",
      username: "test",
    });
    expect(result?.createdAt).toBeUndefined();
  });

  it("parses both pictureUrl and createdAt together", () => {
    const result = parseProfileDetail({
      id: "uuid-10",
      name: "Razzmatazz",
      username: "razzmatazz",
      pictureUrl: "https://cdn.example.com/razz.png",
      createdAt: "2023-01-01T00:00:00Z",
    });
    expect(result).toEqual({
      id: "uuid-10",
      name: "Razzmatazz",
      username: "razzmatazz",
      pictureUrl: "https://cdn.example.com/razz.png",
      createdAt: "2023-01-01T00:00:00Z",
    });
  });
});
