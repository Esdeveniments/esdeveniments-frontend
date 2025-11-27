"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  Sentry.captureException(error);

  return (
    <html>
      <body>
        <h2 className="heading-3">Alguna cosa ha anat malament (global)</h2>
        <button onClick={() => reset()}>Torna a carregar</button>
      </body>
    </html>
  );
}
