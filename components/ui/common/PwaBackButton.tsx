"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "@i18n/routing";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type { PwaBackButtonProps } from "types/props";

const MQ = "(display-mode: standalone)";
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia(MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getSnapshot = () => window.matchMedia(MQ).matches;
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
      className="md:hidden flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] -ml-1 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
      aria-label={t("ariaLabel")}
    >
      <ChevronLeftIcon className="h-5 w-5 flex-shrink-0" />
      <span className="label">{t("label")}</span>
    </button>
  );
}
