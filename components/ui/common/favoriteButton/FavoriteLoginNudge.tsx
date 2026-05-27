"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useAuth } from "@components/hooks/useAuth";
import { GUEST_FAVORITE_SAVED_EVENT } from "@utils/favorites-events";

const SESSION_KEY = "favorites-login-nudge-shown";
const AUTO_HIDE_MS = 6000;

function alreadyShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode, etc.) — nudge just may
    // reappear on a later save; harmless.
  }
}

/**
 * One-per-session, dismissible "sign in to sync your favorites" toast for
 * logged-out visitors. Optimistic local save already happened in
 * FavoriteButton; this only invites them to sign in so it persists.
 * Never blocks interaction, auto-hides, and never repeats in a session.
 */
export default function FavoriteLoginNudge() {
  const t = useTranslations("Components.FavoritesLoginNudge");
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;

    const onGuestSave = () => {
      if (alreadyShownThisSession()) return;
      markShown();
      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    };

    window.addEventListener(GUEST_FAVORITE_SAVED_EVENT, onGuestSave);
    return () => {
      window.removeEventListener(GUEST_FAVORITE_SAVED_EVENT, onGuestSave);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isAuthenticated]);

  // A session that authenticates mid-way should drop any open nudge.
  useEffect(() => {
    if (isAuthenticated) dismiss();
  }, [isAuthenticated, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-900 flex justify-center px-section-x pointer-events-none"
      data-testid="favorites-login-nudge"
    >
      <div className="pointer-events-auto flex items-center gap-3 max-w-md w-full card-bordered bg-background shadow-md rounded-lg px-4 py-3">
        <HeartIconSolid className="h-5 w-5 text-primary shrink-0" />
        <p className="body-small text-foreground/90 flex-1">
          {t("message")}
        </p>
        <Link
          href="/iniciar-sessio"
          className="btn-primary btn-sm whitespace-nowrap"
          onClick={dismiss}
          data-analytics-action="favorites_nudge_login"
        >
          {t("login")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="p-1 text-foreground/60 hover:text-foreground transition-interactive"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
