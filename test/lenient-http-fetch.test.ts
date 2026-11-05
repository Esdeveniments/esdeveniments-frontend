// @vitest-environment node
import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { fetchWithLenientParser } from "@utils/lenient-http-fetch";

let server: Server | undefined;

afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

// Answers every connection with a raw HTTP response, as a broken server would.
async function serveRaw(response: string): Promise<string> {
  server = createServer((socket) => socket.once("data", () => socket.end(response)));
  await new Promise<void>((ready) => server?.listen(0, "127.0.0.1", ready));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return `http://127.0.0.1:${address.port}/poster.jpg`;
}

describe("fetchWithLenientParser", () => {
  it("reads a response whose header has bare line feeds", async () => {
    const url = await serveRaw(
      "HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: 4\r\n" +
        "Content-Security-Policy: \n    img-src 'self';\n    \r\n\r\njpeg",
    );

    const res = await fetchWithLenientParser(url, AbortSignal.timeout(2000), undefined, true);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.has("content-security-policy")).toBe(false);
    expect(await res.text()).toBe("jpeg");
  });

  it("rejects, instead of hanging, on a header value Headers can't hold", async () => {
    const url = await serveRaw(
      "HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\0x\r\nContent-Length: 4\r\n\r\njpeg",
    );

    await expect(
      fetchWithLenientParser(url, AbortSignal.timeout(2000), undefined, true),
    ).rejects.toThrow(TypeError);
  });
});
