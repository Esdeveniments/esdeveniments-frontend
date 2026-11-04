import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { verifyIdToken, verifyStoredIdToken } from "@lib/auth/logto";
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

// Logto self-hosted signs id_tokens with ES384 (EC P-384) — the real case.
const ec = generateKeyPairSync("ec", { namedCurve: "P-384" });
const ecJwk = { ...ec.publicKey.export({ format: "jwk" }), kid: "ec-key" };

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// ECDSA JWS signatures are raw r||s (IEEE P1363), not DER.
function signES384(claims: Record<string, unknown>, key = ec.privateKey): string {
  const head = b64url({ alg: "ES384", kid: "ec-key" });
  const body = b64url(claims);
  const sig = cryptoSign("SHA384", Buffer.from(`${head}.${body}`), {
    key,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `${head}.${body}.${sig}`;
}

const validClaims = {
  iss: config.issuer,
  aud: config.appId,
  exp: Math.floor(Date.now() / 1000) + 3600,
  sub: "user-1",
  nonce: "expected",
  username: "claudetest1",
};

describe("verifyIdToken (ES384 / EC P-384)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockJwks(keys: unknown[] = [ecJwk]) {
    vi.stubGlobal("fetch", async () => Response.json({ keys }, { status: 200 }));
  }

  it("accepts a correctly ES384-signed id_token and checks nonce when given", async () => {
    mockJwks();
    const claims = await verifyIdToken(config, signES384(validClaims), "expected");
    expect(claims.sub).toBe("user-1");
    expect(claims.username).toBe("claudetest1");
  });

  it("verifyStoredIdToken verifies without a nonce (the /me path)", async () => {
    mockJwks();
    const claims = await verifyStoredIdToken(config, signES384(validClaims));
    expect(claims.sub).toBe("user-1");
  });

  it("rejects a tampered signature", async () => {
    mockJwks();
    const t = signES384(validClaims);
    await expect(
      verifyIdToken(config, t.slice(0, -6) + "AAAAAA", "expected"),
    ).rejects.toThrow(/signature/);
  });

  it("rejects a token signed by a different key", async () => {
    mockJwks(); // JWKS advertises our key, token signed by another
    const other = generateKeyPairSync("ec", { namedCurve: "P-384" }).privateKey;
    await expect(
      verifyIdToken(config, signES384(validClaims, other), "expected"),
    ).rejects.toThrow(/signature/);
  });

  it("rejects a nonce mismatch", async () => {
    mockJwks();
    await expect(
      verifyIdToken(config, signES384(validClaims), "different"),
    ).rejects.toThrow(/nonce/);
  });
});
