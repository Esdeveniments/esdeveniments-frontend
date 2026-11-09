import { describe, expect, it } from "vitest";
import { GET } from "../app/index.md/route";

describe("GET /index.md", () => {
  it("points search engines at the HTML homepage", async () => {
    const response = await GET(new Request("https://example.com/index.md"));

    expect(response.headers.get("Link")).toMatch(/^<.+\/>; rel="canonical"$/);
    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  it("stays out of the CDN when served on the homepage URL", async () => {
    const response = await GET(
      new Request("https://example.com/index.md", {
        headers: { "x-markdown-negotiation": "1" },
      }),
    );

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(await response.text()).toMatch(/^---\ntitle: /);
  });
});
