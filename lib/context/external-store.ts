import { useSyncExternalStore } from "react";
import type { ExternalStore } from "types/common";

// State a root provider (AuthProvider, AdProvider) shares with its consumers.
// The providers hydrate before the page's streamed Suspense boundaries are
// revealed, and React can't see which components inside a not-yet-hydrated
// boundary read a context. So a changed context value makes React throw away
// those boundaries' server HTML and client-render them (duplicate content, a
// flash, extra main-thread work), whatever the update's priority. Keep the
// context value stable and send changes through a store: only the components
// that read it re-render.
export function createExternalStore<T>(initial: T): ExternalStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    getInitial: () => initial,
    set(next) {
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// Hydrates with the initial value (what the server rendered), then updates.
export function useExternalStore<T>(store: ExternalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getInitial);
}
