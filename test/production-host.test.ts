import { describe, it, expect } from "vitest";
import {
  isProductionHost,
  isProductionSiteUrl,
  PRODUCTION_HOSTS,
} from "../utils/production-host";

describe("production-host", () => {
  describe("PRODUCTION_HOSTS allowlist", () => {
    it("contains the apex and www production domains", () => {
      expect(PRODUCTION_HOSTS.has("www.esdeveniments.cat")).toBe(true);
      expect(PRODUCTION_HOSTS.has("esdeveniments.cat")).toBe(true);
    });
  });

  describe("isProductionHost", () => {
    it("returns true for production hosts", () => {
      expect(isProductionHost("www.esdeveniments.cat")).toBe(true);
      expect(isProductionHost("esdeveniments.cat")).toBe(true);
    });

    it("strips port before matching", () => {
      expect(isProductionHost("www.esdeveniments.cat:443")).toBe(true);
      expect(isProductionHost("esdeveniments.cat:80")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isProductionHost("WWW.Esdeveniments.CAT")).toBe(true);
    });

    it("returns false for staging host (default-deny)", () => {
      expect(isProductionHost("staging.esdeveniments.cat")).toBe(false);
    });

    it("returns false for PR-preview hosts (any template)", () => {
      // pr- prefix template
      expect(isProductionHost("pr-42.esdeveniments.cat")).toBe(false);
      // Coolify default {{pr_id}}.{{domain}} template — would have leaked
      // under the previous substring-based check.
      expect(isProductionHost("42.esdeveniments.cat")).toBe(false);
    });

    it("returns false for localhost / dev", () => {
      expect(isProductionHost("localhost")).toBe(false);
      expect(isProductionHost("localhost:3000")).toBe(false);
      expect(isProductionHost("127.0.0.1:3000")).toBe(false);
    });

    it("returns false for accidental subdomains (default-deny)", () => {
      expect(isProductionHost("dev.esdeveniments.cat")).toBe(false);
      expect(isProductionHost("foo.bar.esdeveniments.cat")).toBe(false);
    });

    it("returns false for empty / null / undefined", () => {
      expect(isProductionHost("")).toBe(false);
      expect(isProductionHost(null)).toBe(false);
      expect(isProductionHost(undefined)).toBe(false);
    });
  });

  describe("isProductionSiteUrl", () => {
    it("returns true for canonical production URLs", () => {
      expect(isProductionSiteUrl("https://www.esdeveniments.cat")).toBe(true);
      expect(isProductionSiteUrl("https://esdeveniments.cat")).toBe(true);
      expect(isProductionSiteUrl("https://www.esdeveniments.cat/")).toBe(true);
      expect(isProductionSiteUrl("https://www.esdeveniments.cat/some/path")).toBe(
        true,
      );
    });

    it("returns false for staging / preview URLs", () => {
      expect(isProductionSiteUrl("https://staging.esdeveniments.cat")).toBe(
        false,
      );
      expect(isProductionSiteUrl("https://pr-42.esdeveniments.cat")).toBe(false);
      expect(isProductionSiteUrl("https://42.esdeveniments.cat")).toBe(false);
    });

    it("returns false for localhost", () => {
      expect(isProductionSiteUrl("http://localhost:3000")).toBe(false);
    });

    it("returns false for empty / undefined / malformed values", () => {
      expect(isProductionSiteUrl(undefined)).toBe(false);
      expect(isProductionSiteUrl("")).toBe(false);
      expect(isProductionSiteUrl("not a url")).toBe(false);
    });
  });
});
