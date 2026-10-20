"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import type { RefreshSessionProps } from "types/props";
import { refreshSessionAction } from "./actions";

/**
 * Rendered when the server render found no valid access token. Shows its
 * fallback if the refreshed server render still cannot authorize the session.
 */
export default function RefreshSession({ children }: RefreshSessionProps) {
  const router = useRouter();
  const t = useTranslations("App.EventPromote");
  const triedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;
    refreshSessionAction()
      .then((refreshed) => {
        if (refreshed) startTransition(() => router.refresh());
      })
      .catch((error: unknown) => {
        console.error("RefreshSession: refresh action rejected", error);
      })
      .finally(() => setFinished(true));
  }, [router]);

  return !finished || isPending ? (
    <p role="status" className="body-normal text-center text-foreground/80">
      {t("refreshingSession")}
    </p>
  ) : children;
}
