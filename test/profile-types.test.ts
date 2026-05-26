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
    expect(parseProfileSummary(input)).toEqual(input);
  });
});
