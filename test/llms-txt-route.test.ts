import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/llms.txt/route";

describe("GET /llms.txt", () => {
  it("keeps the markdown served for another page's URL out of the CDN", async () => {
    // proxy.ts rewrites `Accept: text/markdown` requests for any page here.
    const request = new NextRequest(
      "https://example.com/llms.txt?_accept=text%2Fmarkdown",
      { headers: { "x-markdown-negotiation": "1" } },
    );

    const response = await GET(request);

    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps a direct markdown /llms.txt out of the CDN", async () => {
    const response = await GET(
      new NextRequest("https://example.com/llms.txt", {
        headers: { accept: "text/markdown" },
      }),
    );

    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("stays CDN-cacheable when /llms.txt is requested directly", async () => {
    const response = await GET(new NextRequest("https://example.com/llms.txt"));

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toContain("public");
  });
});
