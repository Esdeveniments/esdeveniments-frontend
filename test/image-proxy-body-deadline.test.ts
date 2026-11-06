// @vitest-environment node
import http from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "app/api/image-proxy/route";

vi.mock("@utils/public-fetch-safety", () => ({
  getPublicFetchSafety: vi.fn(async () => ({ isSafe: true })),
}));

// An upstream that sends image headers at once, then one byte every 100 ms
// and never ends the body.
let server: http.Server;
let origin: string;
const sockets = new Set<Socket>();

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "image/png" });
    res.write(Buffer.from([0x89]));
    const timer = setInterval(() => res.write(Buffer.from([0])), 100);
    res.on("close", () => clearInterval(timer));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
});

function proxyRequest(signal?: AbortSignal) {
  const target = encodeURIComponent(`${origin}/slow.png`);
  return new Request(`http://localhost/api/image-proxy?url=${target}`, {
    signal,
  });
}

async function settlesWithin<T>(promise: Promise<T>, ms: number) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<"pending">((resolve) => {
    timer = setTimeout(() => resolve("pending"), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitForNoOpenSockets() {
  for (let i = 0; i < 20 && sockets.size > 0; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return sockets.size;
}

describe("image proxy upstream deadline", () => {
  it("aborts a trickling body at the total deadline and frees the socket", async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    // Shrink the 15 s total deadline so the test runs fast.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) =>
      realTimeout(ms >= 15_000 ? 500 : ms),
    );

    const result = await settlesWithin(GET(proxyRequest()), 4000);

    expect(result).not.toBe("pending");
    expect((result as Response).status).toBe(502);
    expect(await waitForNoOpenSockets()).toBe(0);
  });

  it("stops reading the body when the client disconnects", async () => {
    const client = new AbortController();
    setTimeout(() => client.abort(), 300);

    const result = await settlesWithin(GET(proxyRequest(client.signal)), 4000);

    expect(result).not.toBe("pending");
    expect((result as Response).status).toBe(502);
    expect(await waitForNoOpenSockets()).toBe(0);
  });
});
