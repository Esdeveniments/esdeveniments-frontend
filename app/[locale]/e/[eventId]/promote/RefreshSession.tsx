"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@i18n/routing";
import type { RefreshSessionProps } from "types/props";
import { refreshSessionAction } from "./actions";

/**
 * Rendered when the server render found no valid access token. Shows its
 * children only if the refresh fails.
 */
export default function RefreshSession({ children }: RefreshSessionProps) {
  const router = useRouter();
  const triedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;
    refreshSessionAction()
      .then((refreshed) => {
        if (refreshed) router.refresh();
        else setFailed(true);
      })
      .catch((error: unknown) => {
        console.error("RefreshSession: refresh action rejected", error);
        setFailed(true);
      });
  }, [router]);

  return failed ? children : null;
}
