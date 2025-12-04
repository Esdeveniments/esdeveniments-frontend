"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="ca">
      <body>
        <div style={{ padding: 32, textAlign: "center" }}>
          <h1 className="heading-2">Alguna cosa ha anat malament</h1>
          <p>{error?.message || "Si us plau, torna-ho a intentar."}</p>
          <button onClick={reset} style={{ marginTop: 16 }}>
            Torna a carregar
          </button>
        </div>
      </body>
    </html>
  );
}
