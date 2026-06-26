import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { verifyIdToken } from "@lib/auth/logto";
import type { LogtoConfig } from "types/auth";

const config: LogtoConfig = {
  endpoint: "https://auth.example.com",
  issuer: "https://auth.example.com/oidc",
  appId: "app123",
  appSecret: "secret",
  authorizationEndpoint: "https://auth.example.com/oidc/auth",
  tokenEndpoint: "https://auth.example.com/oidc/token",
  userinfoEndpoint: "https://auth.example.com/oidc/me",
  endSessionEndpoint: "https://auth.example.com/oidc/session/end",
  scope: "openid",
};

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key" };

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function signToken(claims: Record<string, unknown>): string {
  const head = b64url({ alg: "RS256", kid: "test-key" });
  const body = b64url(claims);
  const sig = cryptoSign(
    "RSA-SHA256",
    Buffer.from(`${head}.${body}`),
    privateKey,
  ).toString("base64url");
  return `${head}.${body}.${sig}`;
}

const validClaims = {
  iss: config.issuer,
  aud: config.appId,
  exp: Math.floor(Date.now() / 1000) + 3600,
  sub: "user-1",
  nonce: "expected",
};

describe("verifyIdToken (JWKS RS256)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockJwks() {
    vi.stubGlobal("fetch", async () =>
      Response.json({ keys: [jwk] }, { status: 200 }),
    );
  }

  it("accepts a correctly signed id_token", async () => {
    mockJwks();
    const claims = await verifyIdToken(config, signToken(validClaims), "expected");
    expect(claims.sub).toBe("user-1");
  });

  it("rejects a token with a tampered signature", async () => {
    mockJwks();
    const token = signToken(validClaims);
    const tampered = token.slice(0, -4) + "AAAA"; // corrupt the signature
    await expect(verifyIdToken(config, tampered, "expected")).rejects.toThrow(
      /signature/,
    );
  });

  it("rejects a token signed by a different key", async () => {
    mockJwks(); // JWKS advertises our key, but the token is signed by another
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    const head = b64url({ alg: "RS256", kid: "test-key" });
    const body = b64url(validClaims);
    const sig = cryptoSign(
      "RSA-SHA256",
      Buffer.from(`${head}.${body}`),
      other,
    ).toString("base64url");
    await expect(
      verifyIdToken(config, `${head}.${body}.${sig}`, "expected"),
    ).rejects.toThrow(/signature/);
  });
});
