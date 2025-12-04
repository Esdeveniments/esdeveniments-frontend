"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import "../styles/globals.css";

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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div style={{ padding: 32, textAlign: "center" }}>
          <h1 className="heading-2">Alguna cosa ha anat malament</h1>
          <p>
            {process.env.NODE_ENV === "development"
              ? error?.message || "Si us plau, torna-ho a intentar."
              : "Si us plau, torna-ho a intentar."}
          </p>
          <button onClick={reset} style={{ marginTop: 16 }}>
            Torna a carregar
          </button>
        </div>
      </body>
    </html>
  );
}
