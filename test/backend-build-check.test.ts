// @vitest-environment node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { generateHmac } from "@utils/hmac";

const run = promisify(execFile);
let status = 200;
let body = "[]";
let promotedStatus = 200;
let requests: string[] = [];
let headers: Record<string, string | string[] | undefined> = {};
const server = createServer((request, response) => {
  requests.push(request.url ?? "");
  headers = request.headers;
  response.writeHead(request.url?.includes("/events/promoted") ? promotedStatus : status, {
    "Content-Type": "application/json", Location: "/redirected",
  });
  response.end(body);
});
let url = "";

describe("backend build preflight", () => {
  beforeEach(async () => {
    status = 200;
    promotedStatus = 200;
    body = "[]";
    requests = [];
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test listener");
    url = `http://127.0.0.1:${address.port}/api`;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const check = (key = "test-only-backend-key") => run(process.execPath, ["scripts/verify-backend-build.mjs"], {
    env: { ...process.env, NEXT_PUBLIC_API_URL: url, BACKEND_SERVICE_SECRET: key },
  });

  it("authenticates with both migration credentials", async () => {
    await expect(check()).resolves.toMatchObject({ stdout: "Backend v2 build access verified.\n" });
    expect(headers["x-backend-key"]).toBe("test-only-backend-key");
    expect(headers["x-hmac"]).toBe(await generateHmac("", Number(headers["x-timestamp"]), "/api/events/promoted?placement=CATALONIA&size=1", "GET"));
  });

  it("blocks a v1 backend even when the categories read succeeds", async () => {
    promotedStatus = 404;
    await expect(check()).rejects.toMatchObject({ code: 1 });
    expect(requests).toEqual(["/api/categories", "/api/events/promoted?placement=CATALONIA&size=1"]);
  });

  it("fails before fetching when the key is missing", async () => {
    await expect(check("")).rejects.toMatchObject({ code: 1 });
    expect(requests).toEqual([]);
  });

  it.each([401, 302])("fails closed for HTTP %s without following redirects or logging credentials", async (code) => {
    status = code;
    await expect(check()).rejects.toMatchObject({
      code: 1,
      stderr: `Backend build authentication check failed: HTTP ${code}\n`,
    });
    expect(requests).toEqual(["/api/categories"]);
  });

  it.each(["{}", "not-json"])("rejects malformed categories: %s", async (payload) => {
    body = payload;
    await expect(check()).rejects.toMatchObject({ code: 1 });
  });
});
