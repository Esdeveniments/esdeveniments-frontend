"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

// Inline strings to avoid bundling full ca.json (82 KB) and next-intl runtime.
// This page only renders on catastrophic errors — keep it minimal.
const STRINGS = {
  title: "Alguna cosa ha anat malament",
  retry: "Si us plau, torna-ho a intentar.",
  reload: "Torna a carregar",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    const message = error?.message ?? "";
    const normalized = message.toLowerCase();
    const isChunkLoadError =
      error?.name === "ChunkLoadError" ||
      normalized.includes("failed to load chunk") ||
      normalized.includes("loading chunk") ||
      normalized.includes("dynamically imported module");

    if (isChunkLoadError && typeof window !== "undefined") {
      // Reload the page to fetch the latest assets after a deployment
      window.location.reload();
      return;
    }

    captureException(error);
  }, [error]);

  const fallbackMessage = STRINGS.retry;

  return (
    <html lang="ca">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 16 }}>
            {STRINGS.title}
          </h1>
          <p>
            {process.env.NODE_ENV === "development"
              ? error?.message || fallbackMessage
              : fallbackMessage}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 24px",
              borderRadius: 8,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            {STRINGS.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
