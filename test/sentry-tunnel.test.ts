import { describe, it, expect } from "vitest";
import { sentryTunnelFor } from "@utils/sentry-helpers";

describe("sentryTunnelFor", () => {
  it("routes a SaaS DSN through the tunnel path with org and project", () => {
    expect(
      sentryTunnelFor("https://key@o123.ingest.sentry.io/456", "/monitoring"),
    ).toBe("/monitoring?o=123&p=456");
  });

  it("adds the region for regional ingest hosts", () => {
    expect(
      sentryTunnelFor("https://key@o123.ingest.de.sentry.io/456", "/monitoring"),
    ).toBe("/monitoring?o=123&p=456&r=de");
  });

  it("does not tunnel without a DSN, a tunnel path, or a SaaS host", () => {
    expect(sentryTunnelFor(undefined, "/monitoring")).toBeUndefined();
    expect(sentryTunnelFor("https://key@o1.ingest.sentry.io/2", undefined)).toBeUndefined();
    expect(sentryTunnelFor("https://key@sentry.example.com/2", "/monitoring")).toBeUndefined();
    expect(sentryTunnelFor("not a dsn", "/monitoring")).toBeUndefined();
  });
});
