"use client";

import * as Sentry from "@sentry/nextjs";
import { Text } from "@components/ui/primitives";

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
        <Text as="h2" variant="h2">
          Alguna cosa ha anat malament (global)
        </Text>
        <button onClick={() => reset()}>Torna a carregar</button>
      </body>
    </html>
  );
}
