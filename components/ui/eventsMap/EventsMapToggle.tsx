"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { sendGoogleEvent } from "@utils/analytics";
import { afterTransitions } from "@utils/browser";
import { eventsMapLauncher } from "./eventsMapLauncher";

const EventsMap = dynamic(() => import("./EventsMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-fast-pulse" />,
});

// Opens the full-screen map, like Airbnb: a floating "Mapa" pill on mobile and
// a chip in the filter row on desktop (EventsMapChip, via eventsMapLauncher).
// maplibre-gl loads on the first open and stays mounted, so reopening is instant.
export default function EventsMapToggle() {
  const t = useTranslations("Components.EventsMap");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const openMap = (source: string) => {
      setMounted(true);
      setOpen(true);
      if (!trackedRef.current) {
        trackedRef.current = true;
        sendGoogleEvent("map_view_open", { source });
      }
    };
    eventsMapLauncher.set(openMap);
    return () => {
      if (eventsMapLauncher.get() === openMap) eventsMapLauncher.set(null);
    };
  }, []);

  // Layout effect: once the map chunk is cached, the map mounts in the same
  // commit, and its (passive) effect must see an open, sized dialog.
  // Opening and closing are CSS transitions (.events-map-dialog in
  // styles/globals.css) driven by data-closed: a close that starts mid-open
  // reverses from where it is, and a reopen mid-close cancels the close.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        dialog.dataset.closed = "";
        dialog.showModal();
        // Apply the closed style first, so the transition has a start.
        void dialog.offsetWidth;
      }
      delete dialog.dataset.closed;
      document.documentElement.classList.add("overflow-hidden");
      return;
    }
    if (!dialog.open) return;
    dialog.dataset.closed = "";
    return afterTransitions(dialog, () => dialog.close());
  }, [open]);

  // The page stays locked until the dialog has really closed (onClose).
  useEffect(
    () => () => document.documentElement.classList.remove("overflow-hidden"),
    []
  );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => eventsMapLauncher.get()?.("floating_pill")}
        className="md:hidden above-mobile-nav fixed left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 min-h-button px-button-x rounded-button bg-foreground-strong text-background body-small font-semibold shadow-lg focus-ring"
        data-testid="events-map-pill"
      >
        <MapIcon className="w-5 h-5" aria-hidden="true" />
        {t("floating")}
      </button>
      <dialog
        ref={dialogRef}
        aria-label={t("mapTitle")}
        onCancel={(e) => {
          // Esc: close with the transition instead of at once. If the browser
          // won't let us (repeated Esc), it closes now and onClose catches up.
          e.preventDefault();
          setOpen(false);
        }}
        onClose={() => {
          document.documentElement.classList.remove("overflow-hidden");
          setOpen(false);
        }}
        className="events-map-dialog m-0 p-0 w-full h-full max-w-full max-h-full bg-background text-foreground"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
            <h2 className="heading-4 text-foreground-strong">{t("mapTitle")}</h2>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setOpen(false)}
              className="flex-center h-button w-button rounded-button hover:bg-muted focus-ring"
            >
              <XMarkIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          </header>
          <div className="relative flex-1 min-h-0">{mounted ? <EventsMap /> : null}</div>
        </div>
      </dialog>
    </>
  );
}
