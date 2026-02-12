/**
 * Share to TikTok — main orchestrator component.
 *
 * Flow:
 * 1. User clicks "Login with TikTok" → popup opens TikTok OAuth
 * 2. Callback page posts auth code via postMessage → popup closes
 * 3. Code exchanged for access_token via /api/tiktok/token
 * 4. Creator info fetched via /api/tiktok/creator-info
 * 5. User fills post form → publishes → status polling
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { TikTokCreatorInfo, ShareTikTokState } from "types/tiktok";
import TikTokPostForm from "./TikTokPostForm";
import TikTokStatusCheck from "./TikTokStatusCheck";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";

/** Generate PKCE code_verifier and code_challenge (S256) */
async function generatePkce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

export default function ShareTikTok() {
  const [state, setState] = useState<ShareTikTokState>("idle");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(
    null,
  );
  const [publishId, setPublishId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
  const redirectUri =
    process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI ||
    "https://www.esdeveniments.cat/callback";

  const exchangeCode = useCallback(async (code: string) => {
    try {
      const codeVerifier = codeVerifierRef.current;
      if (!codeVerifier) throw new Error("Missing PKCE code_verifier");
      const tokenRes = await fetch("/api/tiktok/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
      });
      const tokenData = (await tokenRes.json()) as Record<string, string>;
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          tokenData.error || "Token exchange failed",
        );
      }
      setAccessToken(tokenData.access_token);

      const infoRes = await fetch("/api/tiktok/creator-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenData.access_token }),
      });
      const infoData = (await infoRes.json()) as {
        data?: TikTokCreatorInfo;
        error?: { code?: string; message?: string };
      };
      if (infoData.error?.code && infoData.error.code !== "ok") {
        throw new Error(
          infoData.error.message || "Failed to fetch creator info",
        );
      }
      setCreatorInfo(infoData.data ?? null);
      setState("authenticated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
      setState("error");
    }
  }, []);

  // Listen for OAuth callback from popup window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Accept messages from same origin or from the redirect URI origin
      // (needed when redirect goes to production but opener is localhost)
      const redirectOrigin = new URL(redirectUri).origin;
      if (
        event.origin !== window.location.origin &&
        event.origin !== redirectOrigin
      ) {
        return;
      }
      const data = event.data as { type?: string; code?: string } | undefined;
      if (data?.type === "tiktok-auth" && data.code) {
        void exchangeCode(data.code);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [exchangeCode, redirectUri]);

  const handleLogin = useCallback(async () => {
    if (!clientKey) {
      setError("NEXT_PUBLIC_TIKTOK_CLIENT_KEY not configured");
      return;
    }
    const { verifier, challenge } = await generatePkce();
    codeVerifierRef.current = verifier;
    const params = new URLSearchParams({
      client_key: clientKey,
      scope: "user.info.basic,video.publish",
      response_type: "code",
      redirect_uri: redirectUri,
      state: crypto.randomUUID(),
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    window.open(
      `${TIKTOK_AUTH_URL}?${params}`,
      "tiktok-auth",
      "width=600,height=700",
    );
  }, [clientKey]);

  if (!clientKey) {
    return (
      <p className="body-normal text-foreground/60">
        TikTok integration not configured (missing NEXT_PUBLIC_TIKTOK_CLIENT_KEY).
      </p>
    );
  }

  // Status check after publishing
  if (state === "done" && publishId && accessToken) {
    return (
      <TikTokStatusCheck accessToken={accessToken} publishId={publishId} />
    );
  }

  // Authenticated — show post form
  if (state === "authenticated" && creatorInfo && accessToken) {
    return (
      <TikTokPostForm
        creatorInfo={creatorInfo}
        accessToken={accessToken}
        onPublished={(result) => {
          setPublishId(result.publish_id);
          setState("done");
        }}
        onError={(msg) => {
          setError(msg);
          setState("error");
        }}
      />
    );
  }

  // Login / error state
  return (
    <div className="stack">
      <h1 className="heading-2">Compartir a TikTok</h1>
      <p className="body-normal text-foreground/80">
        Inicia sessió amb TikTok per publicar un vídeo al teu compte.
      </p>
      {error && (
        <p className="body-small" style={{ color: "var(--destructive, #dc2626)" }}>
          {error}
        </p>
      )}
      <button type="button" className="btn-primary" onClick={handleLogin}>
        Inicia sessió amb TikTok
      </button>
    </div>
  );
}
