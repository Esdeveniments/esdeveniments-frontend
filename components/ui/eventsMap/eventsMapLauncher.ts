import { createExternalStore } from "@lib/context/external-store";

// The filter bar (a separate client-only layer) and the events list (where the
// map lives) are not in the same React tree. EventsMapToggle registers how to
// open the map here; the filter-row chip shows only while one is registered.
// Tiny on purpose: importing it never pulls in maplibre-gl.
export const eventsMapLauncher = createExternalStore<((source: string) => void) | null>(null);
