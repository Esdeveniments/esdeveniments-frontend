import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Store } from "types/store";
export type {
  UserLocation,
  EventLocation,
  Event,
  UIState,
  StoreActions,
  StoreState,
} from "types/store";

// Create the store with minimal state
const useStore = create<Store>()(
  persist(
    (set) => ({
      // Initial UI state
      openModal: false,
      hydrated: false,

      // Initial user location
      userLocation: null,

      // Actions
      setState: (key, value) => {
        set((state) => {
          // Only update the specific property to avoid unnecessary re-renders
          if (state[key] === value) return state; // Skip if value hasn't changed
          return { ...state, [key]: value };
        });
      },

      setHydrated: () => {
        set((state) => ({ ...state, hydrated: true }));
      },
    }),
    {
      name: "events-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist UI state that should survive browser restarts
        hydrated: state.hydrated,
      }),
    }
  )
);

export default useStore;
