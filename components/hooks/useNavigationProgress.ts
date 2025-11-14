"use client";

import { create } from "zustand";
import type { NavigationState } from "types/common";

const MIN_DISPLAY_TIME = 200; // Minimum time to show progress bar (200ms)

export const useNavigationProgressStore = create<NavigationState>(
  (set, get) => ({
    isNavigating: false,
    _timeoutId: null,
    _debounceTimeoutId: null,
    _startTime: null,
    start: () => {
      // Clear any existing timeouts from the state
      const { _timeoutId, _debounceTimeoutId } = get();
      if (_timeoutId) clearTimeout(_timeoutId);
      if (_debounceTimeoutId) clearTimeout(_debounceTimeoutId);

      const startTime = Date.now();

      // Set a new timeout to prevent a stuck state
      const newTimeoutId = setTimeout(() => {
        set({ isNavigating: false, _timeoutId: null, _startTime: null });
      }, 5000);

      // Update the state
      set({
        isNavigating: true,
        _timeoutId: newTimeoutId,
        _debounceTimeoutId: null,
        _startTime: startTime,
      });
    },
    done: () => {
      // Clear any pending done() call
      const { _debounceTimeoutId } = get();
      if (_debounceTimeoutId) clearTimeout(_debounceTimeoutId);

      // Debounce done() to reduce flicker
      const newDebounceTimeoutId = setTimeout(() => {
        const { _timeoutId, _startTime } = get();
        if (_timeoutId) clearTimeout(_timeoutId);

        // Ensure progress bar is visible for at least MIN_DISPLAY_TIME
        const elapsed = _startTime ? Date.now() - _startTime : MIN_DISPLAY_TIME;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);

        if (remainingTime > 0) {
          // Wait for remaining time before hiding
          setTimeout(() => {
            set({
              isNavigating: false,
              _timeoutId: null,
              _debounceTimeoutId: null,
              _startTime: null,
            });
          }, remainingTime);
        } else {
          // Already shown long enough, hide immediately
          set({
            isNavigating: false,
            _timeoutId: null,
            _debounceTimeoutId: null,
            _startTime: null,
          });
        }
      }, 150);

      set({ _debounceTimeoutId: newDebounceTimeoutId });
    },
  })
);
