"use client";

import { create } from "zustand";
import type { NavigationState } from "types/common";

let timeoutId: NodeJS.Timeout | null = null;
let debounceTimeoutId: NodeJS.Timeout | null = null;

export const useNavigationProgressStore = create<NavigationState>((set) => ({
  isNavigating: false,
  start: () => {
    // Clear any existing timeouts
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
      debounceTimeoutId = null;
    }

    set({ isNavigating: true });

    // Auto-clear after 5 seconds to prevent stuck state
    timeoutId = setTimeout(() => {
      set({ isNavigating: false });
      timeoutId = null;
    }, 5000);
  },
  done: () => {
    // Debounce done() by 150ms to reduce flicker
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }

    debounceTimeoutId = setTimeout(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      set({ isNavigating: false });
      debounceTimeoutId = null;
    }, 150);
  },
}));

