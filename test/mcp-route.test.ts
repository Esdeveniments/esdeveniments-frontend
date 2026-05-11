import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "../app/mcp/route";

function buildMcpRequest(contentType: string): NextRequest {
  return new NextRequest("http://localhost:3000/mcp", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
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
    expect(body.error.message).toBe("Content-Type must be application/json");
  });
});