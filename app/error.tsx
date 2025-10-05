"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Text } from "@components/ui/primitives";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="py-page-y text-center">
      <Text as="h1" variant="h1">
        Alguna cosa ha anat malament
      </Text>
      <Text as="p" variant="body">
        {error?.message || "Si us plau, torna-ho a intentar."}
      </Text>
      <button onClick={reset} className="mt-margin-sm">
        Torna a carregar
      </button>
    </div>
  );
}
