"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { sendGoogleEvent, ensureGtag } from "@utils/analytics";

// Fires once per page load when the OIDC callback redirects back with a
// one-shot `auth_success`/`auth_error` marker (set by /api/auth/callback).
// The callback landing is always a hard navigation, so GoogleScripts'
// `lazyOnload` gtag shim hasn't necessarily run yet when this effect fires —
// `ensureGtag()` installs the shim first so the event isn't silently
// dropped. Strips the marker from the URL afterward (via replaceState, no
// navigation) so a page reload doesn't double-count the same auth outcome.
function AuthResultTracker() {
  const searchParams = useSearchParams();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    const success = searchParams?.get("auth_success");
    const errorReason = searchParams?.get("auth_error");
    if (!success && !errorReason) return;

    ensureGtag();
    if (success) {
      sendGoogleEvent("auth_success", {});
    } else if (errorReason) {
      sendGoogleEvent("auth_failure", { reason: errorReason });
    }
    hasTrackedRef.current = true;

    const url = new URL(window.location.href);
    url.searchParams.delete("auth_success");
    url.searchParams.delete("auth_error");
    window.history.replaceState(window.history.state, "", url);
  }, [searchParams]);

  return null;
}

// Delegated click tracker for any element carrying `data-analytics-action`
// (auth gate CTAs, navbar/footer login+logout links). One document-level
// listener covers every current and future call site without per-component
// wiring — activates markup that already exists but was never read.
function AuthGateClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const actionEl = target.closest<HTMLElement>("[data-analytics-action]");
      const action = actionEl?.dataset.analyticsAction;
      if (!action) return;
      ensureGtag();
      sendGoogleEvent("auth_gate_click", { action });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}

export default function AuthEventTracker() {
  return (
    <>
      <AuthGateClickTracker />
      <Suspense fallback={null}>
        <AuthResultTracker />
      </Suspense>
    </>
  );
}
