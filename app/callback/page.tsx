/**
 * OAuth callback page — displays the authorization code from the URL.
 * Used for TikTok app review demo video.
 * This is a client component that reads the URL params.
 */
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const scopes = searchParams.get("scopes");

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", maxWidth: "600px", margin: "0 auto" }}>
      <h1 className="heading-2">OAuth Callback</h1>
      {error ? (
        <p style={{ color: "red" }}>Error: {error}</p>
      ) : code ? (
        <>
          <p style={{ color: "green", fontWeight: "bold" }}>✅ Authorization successful!</p>
          <p><strong>Code:</strong> {code.slice(0, 20)}...</p>
          <p><strong>Scopes:</strong> {scopes}</p>
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

export default function CallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}>
      <CallbackContent />
    </Suspense>
  );
}
