// @vitest-environment node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const CHUNK = "/_next/static/chunks/0fd_r_sckp-62.js";
const STYLES = "/_next/static/chunks/0bq9z_yxj3w1a.css";
// The inlined RSC payload is a Flight stream: a 4096-byte chunk boundary inside a
// URL leaves the row header "25:o3f4," in the middle of the name (seen 2026-11-18).
const SPLIT_CHUNK = "/_next/static/chunks/0fd_r_s25:o3f4,ckp-62.js";
const PAGE =
  `<link rel="stylesheet" href="${STYLES}"><script src="${CHUNK}" async></script>` +
  `<script>self.__next_f.push([1,"25:o3f4,{\\"src\\":\\"${SPLIT_CHUNK}\\"}"])</script>`;

let requests: string[] = [];
let missing = "";
const server = createServer((request, response) => {
  const path = request.url ?? "";
  requests.push(path);
  if (path === "/barcelona") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(PAGE);
  } else if ([CHUNK, STYLES].includes(path) && path !== missing) {
    response.writeHead(200, { "Content-Type": path.endsWith(".css") ? "text/css" : "application/javascript" });
    response.end("");
  } else {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<h1>Not found</h1>");
  }
});

describe("static asset check", () => {
  let url = "";
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test listener");
    url = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    requests = [];
    missing = "";
  });

  const check = () => run("bash", ["scripts/check-static-assets.sh", url, "/barcelona"]);

  it("ignores a chunk name cut in two by a Flight row header", async () => {
    await expect(check()).resolves.toMatchObject({ stdout: "/barcelona: 2 static assets OK\n" });
    expect(requests).toEqual(expect.arrayContaining([CHUNK, STYLES]));
    expect(requests).not.toContain(SPLIT_CHUNK);
  });

  it("still fails when a referenced chunk does not load", async () => {
    missing = CHUNK;
    await expect(check()).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("::error::/barcelona: 1/2 static assets failed to load"),
    });
  });
});
