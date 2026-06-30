"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "@i18n/routing";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type { PwaBackButtonProps } from "types/props";

const MQ = "(display-mode: standalone)";
let _mq: MediaQueryList | null = null;
function getMQ(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return null;
  if (!_mq) _mq = window.matchMedia(MQ);
  return _mq;
}
function subscribeStandalone(cb: () => void) {
  const mq = getMQ();
  if (!mq) return () => {};
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }
  // addListener fallback for iOS < 14 (deprecated but only option on older Safari)
  mq.addListener(cb);
  return () => mq.removeListener(cb);
}
// ponytail: navigator.standalone covers iOS 11–13 where display-mode: standalone is unreliable
const getSnapshot = () =>
  (getMQ()?.matches ?? false) ||
  ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
const getServerSnapshot = () => false;

export default function PwaBackButton({ fallbackHref = "/" }: PwaBackButtonProps) {
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getSnapshot,
    getServerSnapshot
  );
  const router = useRouter();
  const t = useTranslations("Components.PwaBackButton");

  if (!isStandalone) return null;

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref ?? "/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="md:hidden flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-section-x pt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-button"
      aria-label={t("ariaLabel")}
    >
      <ChevronLeftIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="label">{t("label")}</span>
    </button>
  );
}
