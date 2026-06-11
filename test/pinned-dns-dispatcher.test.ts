// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { fetch } from "undici";
import { buildPinnedDnsDispatcher } from "@utils/pinned-dns-dispatcher";

let server: Server | undefined;

function startLoopbackServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    });
    server = srv;
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

afterEach(
  () =>
    new Promise<void>((resolve) => {
      if (!server) return resolve();
      // Destroy any kept-alive sockets so close() doesn't hang the suite.
      server.closeAllConnections?.();
      server.close(() => {
        server = undefined;
        resolve();
      });
    }),
);

describe("buildPinnedDnsDispatcher", () => {
  // Regression guard. Node's autoSelectFamily (Happy Eyeballs, default since
  // Node 20) calls the connect-time lookup with { all: true } and expects an
  // ARRAY of records. Answering with the single-address signature made every
  // connection fail with "Invalid IP address: undefined" and 502'd every
  // proxied image. Only a real fetch through the dispatcher exercises this
  // path — a mocked fetch never invokes lookup, which is why nothing caught it.
  it("connects through a pinned record on { all: true } lookups", async () => {
    const port = await startLoopbackServer();
    const dispatcher = buildPinnedDnsDispatcher(
      [{ address: "127.0.0.1", family: 4 }],
      false,
    );
    expect(dispatcher).not.toBeNull();

    // .invalid never resolves via real DNS, so a 200 proves the pinned lookup
    // (not ambient resolution) carried the connection.
    const response = await fetch(`http://pinned.invalid:${port}/`, {
      dispatcher: dispatcher ?? undefined,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("returns null when there are no records to pin to", () => {
    expect(buildPinnedDnsDispatcher([], true)).toBeNull();
  });
});
