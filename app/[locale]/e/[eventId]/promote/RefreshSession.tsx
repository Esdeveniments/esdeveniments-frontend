"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@i18n/routing";
import { refreshSessionAction } from "./actions";

/** Rendered when the server render found no valid access token. */
export default function RefreshSession() {
  const router = useRouter();
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) return;
    triedRef.current = true;
    void refreshSessionAction().then((refreshed) => {
      if (refreshed) router.refresh();
    });
  }, [router]);

  return null;
}
