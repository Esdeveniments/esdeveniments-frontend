"use client";

import { useTranslations } from "next-intl";
import { MapIcon } from "@heroicons/react/24/outline";
import { useExternalStore } from "@lib/context/external-store";
import { eventsMapLauncher } from "./eventsMapLauncher";

// Desktop "Mapa" switch next to the filters (Airbnb, Gencat). Mobile uses the
// floating pill in EventsMapToggle instead.
export default function EventsMapChip() {
  const t = useTranslations("Components.EventsMap");
  const openMap = useExternalStore(eventsMapLauncher);
  if (!openMap) return null;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => openMap("filters_chip")}
      className="hidden md:flex flex-none items-center gap-element-gap-sm ml-element-gap py-badge-y px-badge-x rounded-badge border border-border bg-background body-small font-medium text-foreground-strong whitespace-nowrap hover:bg-muted transition-interactive focus-ring"
      data-testid="events-map-chip"
    >
      <MapIcon className="h-4 w-4" aria-hidden="true" />
      {t("floating")}
    </button>
  );
}
