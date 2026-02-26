import { describe, it, expect } from "vitest";
import {
  parseProfileDetail,
  parseProfileSummary,
} from "../lib/validation/profile";

describe("lib/validation/profile", () => {
  describe("parseProfileDetail", () => {
    it("parses valid profile data correctly", () => {
      const input = {
        id: "uuid-1",
        slug: "razzmatazz",
        name: "Razzmatazz",
        avatarUrl: "https://example.com/avatar.jpg",
        coverUrl: "https://example.com/cover.jpg",
        bio: "A great venue",
        website: "https://razzmatazz.com",
        verified: true,
        joinedDate: "2024-01-15",
        totalEvents: 42,
        city: "Barcelona",
        region: "Barcelonès",
        socialLinks: {
          instagram: "https://instagram.com/razzmatazz",
        },
      };

      const result = parseProfileDetail(input);
      expect(result).not.toBeNull();
      expect(result?.slug).toBe("razzmatazz");
      expect(result?.name).toBe("Razzmatazz");
      expect(result?.verified).toBe(true);
      expect(result?.totalEvents).toBe(42);
      expect(result?.socialLinks?.instagram).toBe(
        "https://instagram.com/razzmatazz"
      );
    });

    it("uses safe defaults for missing optional fields", () => {
      const input = {
        id: "uuid-2",
        slug: "minimal-venue",
        name: "Minimal Venue",
      };

      const result = parseProfileDetail(input);
      expect(result).not.toBeNull();
      expect(result?.avatarUrl).toBeNull();
      expect(result?.coverUrl).toBeNull();
      expect(result?.bio).toBeNull();
      expect(result?.website).toBeNull();
      expect(result?.verified).toBe(false);
      expect(result?.joinedDate).toBe("");
      expect(result?.totalEvents).toBe(0);
    });

    it("returns null for completely invalid data", () => {
      const result = parseProfileDetail("invalid");
      expect(result).toBeNull();
    });

    it("returns null for missing required fields", () => {
      const result = parseProfileDetail({ id: "uuid-3" });
      expect(result).toBeNull();
    });
  });

  describe("parseProfileSummary", () => {
    it("parses valid summary data", () => {
      const input = {
        id: "uuid-4",
        slug: "test-venue",
        name: "Test Venue",
        verified: true,
        totalEvents: 10,
      };

      const result = parseProfileSummary(input);
      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test-venue");
      expect(result?.totalEvents).toBe(10);
    });

    it("returns null for invalid input", () => {
      const result = parseProfileSummary(null);
      expect(result).toBeNull();
    });
  });
});
