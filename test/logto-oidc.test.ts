import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildAuthorizationUrl,
  buildEndSessionUrl,
  generatePkce,
  getLogtoConfig,
  mapUserInfoToAuthUser,
  sanitizeReturnTo,
  validateIdTokenClaims,
} from "@lib/auth/logto";
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
  scope: "openid profile email offline_access custom_data roles",
};

// Build a structurally-valid but unsigned JWT — validateIdTokenClaims only
// decodes the payload (signature is trusted via back-channel TLS).
function fakeIdToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.signature`;
}

describe("generatePkce", () => {
  it("derives the challenge as base64url(sha256(verifier))", () => {
    const { codeVerifier, codeChallenge } = generatePkce();
    const expected = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    expect(codeChallenge).toBe(expected);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("sanitizeReturnTo", () => {
  it("allows safe relative paths", () => {
    expect(sanitizeReturnTo("/perfil/abc")).toBe("/perfil/abc");
  });
  it("rejects protocol-relative and absolute URLs", () => {
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
    expect(sanitizeReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
  });
  it("rejects backslash, encoded-slash and control-char bypasses", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBeNull();
    expect(sanitizeReturnTo("/path\\x")).toBeNull();
    expect(sanitizeReturnTo("/%2fevil.com")).toBeNull();
    expect(sanitizeReturnTo("/%2Fevil.com")).toBeNull();
    expect(sanitizeReturnTo("/foo\nbar")).toBeNull();
  });
  it("rejects percent-encoded backslash and CRLF bypasses", () => {
    expect(sanitizeReturnTo("/%5cevil.com")).toBeNull();
    expect(sanitizeReturnTo("/%5Cevil.com")).toBeNull();
    expect(sanitizeReturnTo("/foo%0d%0aSet-Cookie:x")).toBeNull();
    expect(sanitizeReturnTo("/foo%09bar")).toBeNull();
  });
});

describe("buildAuthorizationUrl", () => {
  it("includes PKCE, code response type and offline_access scope", () => {
    const url = new URL(
      buildAuthorizationUrl({
        config,
        redirectUri: "https://app.test/api/auth/callback",
        state: "st",
        nonce: "no",
        codeChallenge: "cc",
      }),
    );
    expect(url.origin + url.pathname).toBe(config.authorizationEndpoint);
    expect(url.searchParams.get("client_id")).toBe("app123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("cc");
    expect(url.searchParams.get("scope")).toContain("offline_access");
  });
});

describe("buildEndSessionUrl", () => {
  it("sets post_logout_redirect_uri and id_token_hint when present", () => {
    const url = new URL(
      buildEndSessionUrl({
        config,
        idTokenHint: "tok",
        postLogoutRedirectUri: "https://app.test/",
      }),
    );
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe(
      "https://app.test/",
    );
    expect(url.searchParams.get("id_token_hint")).toBe("tok");
  });
});

describe("validateIdTokenClaims", () => {
  const valid = {
    iss: config.issuer,
    aud: config.appId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: "user-1",
    nonce: "expected",
  };

  it("accepts a token with matching iss/aud/exp/nonce", () => {
    expect(
      validateIdTokenClaims(config, fakeIdToken(valid), "expected").sub,
    ).toBe("user-1");
  });

  it("rejects issuer mismatch", () => {
    expect(() =>
      validateIdTokenClaims(
        config,
        fakeIdToken({ ...valid, iss: "https://evil/oidc" }),
        "expected",
      ),
    ).toThrow(/issuer/);
  });

  it("rejects nonce mismatch", () => {
    expect(() =>
      validateIdTokenClaims(config, fakeIdToken(valid), "different"),
    ).toThrow(/nonce/);
  });

  it("rejects tokens expired beyond the clock-skew tolerance", () => {
    expect(() =>
      validateIdTokenClaims(
        config,
        fakeIdToken({ ...valid, exp: Math.floor(Date.now() / 1000) - 120 }),
        "expected",
      ),
    ).toThrow(/expired/);
  });

  it("accepts a token within the clock-skew tolerance", () => {
    // Expired 10s ago but inside the 60s skew window — still valid.
    expect(
      validateIdTokenClaims(
        config,
        fakeIdToken({ ...valid, exp: Math.floor(Date.now() / 1000) - 10 }),
        "expected",
      ).sub,
    ).toBe("user-1");
  });
});

describe("mapUserInfoToAuthUser", () => {
  it("maps OIDC claims, admin role, name and username", () => {
    const user = mapUserInfoToAuthUser({
      sub: "abc",
      email: "a@b.com",
      email_verified: true,
      name: "Alice",
      username: "alice",
      picture: "https://img/a.png",
      roles: ["admin"],
    });
    expect(user).toMatchObject({
      id: "abc",
      email: "a@b.com",
      name: "Alice",
      username: "alice",
      avatarUrl: "https://img/a.png",
      emailVerified: true,
      role: "ADMIN",
    });
  });

  it("maps the organization role", () => {
    const user = mapUserInfoToAuthUser({
      sub: "o",
      username: "org",
      roles: ["organization"],
    });
    expect(user.role).toBe("ORGANIZATION");
  });

  it("falls back name to username and leaves role undefined", () => {
    const user = mapUserInfoToAuthUser({ sub: "x", username: "bob" });
    expect(user.name).toBe("bob");
    expect(user.username).toBe("bob");
    expect(user.role).toBeUndefined();
  });
});

describe("getLogtoConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("throws when LOGTO_ENDPOINT is missing", () => {
    delete process.env.LOGTO_ENDPOINT;
    expect(() => getLogtoConfig()).toThrow(/LOGTO_ENDPOINT/);
  });

  it("derives OIDC endpoints from the base endpoint", () => {
    process.env.LOGTO_ENDPOINT = "https://auth.example.com/";
    process.env.LOGTO_APP_ID = "id";
    process.env.LOGTO_APP_SECRET = "secret";
    const cfg = getLogtoConfig();
    expect(cfg.issuer).toBe("https://auth.example.com/oidc");
    expect(cfg.tokenEndpoint).toBe("https://auth.example.com/oidc/token");
    expect(cfg.userinfoEndpoint).toBe("https://auth.example.com/oidc/me");
  });
});
