import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { EventSummaryResponseDTO } from "types/api/event";

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

// Pagination state interface (for infinite scroll)
interface PaginationState {
  loadedEvents: EventSummaryResponseDTO[];
  currentPage: number;
  scrollPosition: number;
  hasMoreEvents: boolean;
  lastUpdated?: number; // Timestamp for invalidation
}

// UI state interface
interface UIState {
  openModal: boolean;
  hydrated: boolean;
}

// Event state interface (removed - events now handled server-side)
// All event data is now passed as props to server components

// Combined store state interface - URL-first, no filter state
export interface StoreState extends UIState, PaginationState {
  userLocation: UserLocation | null;
}

// Store actions interface - enhanced with category management
export interface StoreActions {
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  initializeStore: (initialState: Partial<StoreState>) => void;
  setHydrated: () => void;

  // Pagination actions
  loadMoreEvents: (
    newEvents: EventSummaryResponseDTO[],
    isLast: boolean
  ) => void;
  resetPagination: () => void;
  saveScrollPosition: () => void;
}

// Complete store type
export type Store = StoreState & StoreActions;

// Pagination persistence state (only what we need to maintain across navigation)
type PaginationPersistState = Pick<
  StoreState,
  | "loadedEvents"
  | "currentPage"
  | "scrollPosition"
  | "hasMoreEvents"
  | "lastUpdated"
>;

// Minimal persistence configuration for pagination and categories
const persistConfig: PersistOptions<Store, PaginationPersistState> = {
  name: "events-pagination",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    loadedEvents: state.loadedEvents,
    currentPage: state.currentPage,
    scrollPosition: state.scrollPosition,
    hasMoreEvents: state.hasMoreEvents,
    lastUpdated: state.lastUpdated,
  }),
};

// Create the store with proper type inference and enhanced persistence
const useStore = create<Store>()(
  persist(
    (set) => ({
      // Initial UI state
      openModal: false,
      hydrated: false,

      // Initial pagination state
      loadedEvents: [],
      currentPage: 0,
      scrollPosition: 0,
      hasMoreEvents: true,
      lastUpdated: undefined,

      // Other initial state
      userLocation: null,

      // Actions
      setState: (key, value) => {
        set((state) => ({ ...state, [key]: value }));
      },

      initializeStore: (initialState) => {
        set((state) => {
          // Only merge non-filter state (pagination, UI, cache)
          const newState = { ...state, ...initialState };

          // Reset pagination state for fresh data
          newState.hasMoreEvents = true;
          newState.currentPage = 0;

          return newState;
        });
      },

      setHydrated: () => {
        set((state) => ({ ...state, hydrated: true }));
      },

      // Pagination actions
      loadMoreEvents: (newEvents, isLast) => {
        set((state) => {
          const MAX_EVENTS = 100; // Limit stored events
          const allEvents = [...state.loadedEvents, ...newEvents];

          // Trim to max events if needed (keep most recent)
          const trimmedEvents =
            allEvents.length > MAX_EVENTS
              ? allEvents.slice(-MAX_EVENTS)
              : allEvents;

          return {
            ...state,
            loadedEvents: trimmedEvents,
            currentPage: state.currentPage + 1,
            hasMoreEvents: !isLast,
            lastUpdated: Date.now(),
          };
        });
      },

      resetPagination: () => {
        set((state) => ({
          ...state,
          loadedEvents: [],
          currentPage: 0,
          scrollPosition: 0,
          hasMoreEvents: true,
          lastUpdated: undefined,
        }));
      },

      saveScrollPosition: () => {
        if (typeof window !== "undefined") {
          set((state) => ({
            ...state,
            scrollPosition: window.scrollY,
          }));
        }
      },
    }),
    persistConfig
  )
);

export default useStore;
