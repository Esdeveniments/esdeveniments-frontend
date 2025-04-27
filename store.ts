import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { ListEvent } from "types/api/event";

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

// Filter state interface
interface FilterState {
  page: number;
  place: string;
  byDate: string;
  category: EventCategory | "";
  searchTerm: string;
  distance: string;
  filtersApplied: boolean;
}

// UI state interface
interface UIState {
  openModal: boolean;
  scrollPosition: number;
}

// Event state interface
export interface EventState {
  /**
   * All event lists should use ListEvent[], which is aligned with backend EventSummaryResponseDTO (and AdEvent).
   * Do NOT use the custom Event interface above for backend data.
   */
  categorizedEvents: Record<string, ListEvent[]>;
  latestEvents: ListEvent[];
  events: ListEvent[];
  noEventsFound: boolean;
}

// Combined store state interface
export interface StoreState extends FilterState, UIState, EventState {
  userLocation: UserLocation | null;
  currentYear: number;
}

// Store actions interface
export interface StoreActions {
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  initializeStore: (initialState: Partial<StoreState>) => void;
  areFiltersActive: () => boolean;
}

// Complete store type
export type Store = StoreState & StoreActions;

type PersistState = Pick<StoreState, "page" | "currentYear" | "scrollPosition">;

// Persist configuration
const persistConfig: PersistOptions<Store, PersistState> = {
  name: "filterState",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    page: state.page,
    currentYear: state.currentYear,
    scrollPosition: state.scrollPosition,
  }),
};

// Create the store with proper type inference
const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial filter state
      page: 1,
      place: "",
      byDate: "",
      category: "",
      searchTerm: "",
      distance: "",
      filtersApplied: false,

      // Initial UI state
      openModal: false,
      scrollPosition: 0,

      // Initial event state
      categorizedEvents: {},
      latestEvents: [],
      events: [],
      noEventsFound: false,

      // Other initial state
      userLocation: null,
      currentYear: new Date().getFullYear(),

      // Actions
      setState: (key, value) => {
        set((state) => ({ ...state, [key]: value }));
      },

      initializeStore: (initialState) => {
        set(initialState);
      },

      areFiltersActive: () => {
        const state = get();
        return (
          Boolean(state.place) ||
          Boolean(state.byDate) ||
          Boolean(state.category) ||
          Boolean(state.searchTerm) ||
          Boolean(state.distance)
        );
      },
    }),
    persistConfig
  )
);

export default useStore;
