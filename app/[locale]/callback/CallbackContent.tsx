/**
 * OAuth callback client content — displays the authorization code
 * and posts it back to the opener window (popup flow for TikTok share page).
 */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const scopes = searchParams.get("scopes");

  // If opened as a popup, send the code to the opener and close.
  // Uses "*" target origin because the opener may be on a different origin
  // (e.g. localhost during dev vs production callback URL).
  // This is safe: the auth code is already visible in the URL bar.
  useEffect(() => {
    if (window.opener && code) {
      window.opener.postMessage({ type: "tiktok-auth", code }, "*");
      window.close();
    }
  }, [code]);

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "monospace",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1 className="heading-2">OAuth Callback</h1>
      {error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : code ? (
        <>
          <p style={{ color: "green", fontWeight: "bold" }}>
            ✅ Authorization successful!
          </p>
          <p>
            <strong>Code:</strong> {code.slice(0, 20)}...
          </p>
          <p>
            <strong>Scopes:</strong> {scopes}
          </p>
          <p style={{ marginTop: "1rem", color: "#666" }}>
            Copy the full URL from the browser bar and paste it in the terminal.
          </p>
        </>
      ) : (
        <p>Waiting for authorization...</p>
      )}
    </div>
  );
}
