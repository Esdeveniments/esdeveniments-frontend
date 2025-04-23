"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1>Alguna cosa ha anat malament</h1>
      <p>{error?.message || "Si us plau, torna-ho a intentar."}</p>
      <button onClick={reset} style={{ marginTop: 16 }}>
        Torna a carregar
      </button>
    </div>
  );
}
