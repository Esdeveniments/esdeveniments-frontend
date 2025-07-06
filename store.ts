import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Base interfaces
export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
}

export enum EventCategory {
  "Festes Majors" = "Festa Major",
  Festivals = "Festival",
  Familiar = "Familiar",
  Música = "Música",
  Cinema = "Cinema",
  Teatre = "Teatre",
  Exposicions = "Exposició",
  Fires = "Fira",
  Espectacles = "Espectacles",
}

// Dynamic category interface for new system
export interface DynamicEventCategory {
  id: number;
  name: string;
  slug: string;
}

// Union type for transition period - supports both legacy and dynamic
export type EventCategoryType = EventCategory | DynamicEventCategory | string;

// NOTE: The following Event interface is for frontend-only or transformed events.
// For all backend-aligned event data, use EventSummaryResponseDTO or ListEvent from types/api/event.
export interface Event {
  id: string;
  title: string;
  description: string;
  image: string;
  /** URL of an image uploaded by the user */
  imageUploaded?: string;
  /** URL of an image associated with the event */
  imageUrl: string;
  url: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  place: string;
  category: EventCategory | "";
  distance?: number;
  location?: string;
  subLocation?: string;
  postalCode?: string;
  slug: string;
  isAd?: boolean;
  formattedStart: string;
  formattedEnd?: string;
  isFullDayEvent: boolean;
  duration: string;
  timeUntilEvent: string;
  videoUrl?: string;
  nameDay: string;
  weather?: {
    description?: string;
    icon?: string;
  };
}

// Filter state interface - REMOVED: Filters now live in URL only
// URL is the single source of truth for: place, byDate, category, searchTerm, distance

// UI state interface
interface UIState {
  openModal: boolean;
  hydrated: boolean;
}

// Combined store state interface - URL-first, minimal state
export interface StoreState extends UIState {
  userLocation: UserLocation | null;
}

// Store actions interface - simplified
export interface StoreActions {
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  setHydrated: () => void;
}

// Complete store type
export type Store = StoreState & StoreActions;

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
