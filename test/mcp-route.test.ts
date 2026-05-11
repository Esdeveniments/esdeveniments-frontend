import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { POST } from "../app/mcp/route";

function buildMcpRequest(contentType: string, clientIp = "203.0.113.10"): NextRequest {
  return new NextRequest("http://localhost:3000/mcp", {
    method: "POST",
    headers: { "content-type": contentType, "x-real-ip": clientIp },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
  });
}

function buildMcpBodyRequest(body: object, clientIp: string): NextRequest {
  return new NextRequest("http://localhost:3000/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": clientIp },
    body: JSON.stringify(body),
  });
}

describe("MCP route", () => {
  it("accepts JSON content type with parameters case-insensitively", async () => {
    const response = await POST(buildMcpRequest("Application/JSON; charset=utf-8"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
  });

  it("rejects JSON-looking non-JSON content types", async () => {
    const response = await POST(buildMcpRequest("application/jsonp"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Mcp-Protocol-Version")).toBe("2025-03-26");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(body.error.message).toBe("Content-Type must be application/json");
  });

  it("includes MCP headers on rate-limited responses", async () => {
    const clientIp = "203.0.113.20";

    for (let requestCount = 0; requestCount < 60; requestCount += 1) {
      const response = await POST(buildMcpRequest("application/json", clientIp));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(buildMcpRequest("application/json", clientIp));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Mcp-Protocol-Version")).toBe("2025-03-26");
    expect(blocked.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(blocked.headers.get("Access-Control-Expose-Headers")).toBe(
      "Mcp-Protocol-Version",
    );
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("bounds resource fetches with an abort signal", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("guide", { status: 200, headers: { "content-type": "text/plain" } }),
    );

    const response = await POST(
      buildMcpBodyRequest(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "resources/read",
          params: { uri: "http://localhost:3000/llms.txt" },
        },
        "203.0.113.30",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.contents[0].text).toBe("guide");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/llms.txt",
      expect.objectContaining({
        redirect: "manual",
        signal: expect.any(AbortSignal),
      }),
    );

    fetchMock.mockRestore();
  });
});