import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getInternalApiUrl } from "../utils/api-helpers";

const originalEnv = { ...process.env };

describe("utils/api-helpers:getInternalApiUrl", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    // non-production -> siteUrl = http://localhost:3000
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds absolute URLs from app-relative API paths", () => {
    expect(getInternalApiUrl("/api/foo?x=1")).toBe(
      "http://localhost:3000/api/foo?x=1"
    );
    expect(getInternalApiUrl("api/bar")).toBe("http://localhost:3000/api/bar");
  });
});
