"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { PlaceType } from "types/common";
import type { HeroContextType } from "types/ui";

const HeroContext = createContext<HeroContextType | undefined>(undefined);

export function HeroProvider({
  children,
  initialPlace = "catalunya",
  initialLabel = "Catalunya",
  initialPlaceType = "region",
  initialSearchTerm = "",
  initialDate = null,
}: {
  children: ReactNode;
  initialPlace?: string;
  initialLabel?: string;
  initialPlaceType?: PlaceType;
  initialSearchTerm?: string;
  initialDate?: string | null;
}) {
  const [place, setPlaceState] = useState(initialPlace);
  const [label, setLabelState] = useState(initialLabel);
  const [placeType, setPlaceTypeState] = useState<PlaceType>(initialPlaceType);
  const [searchTerm, setSearchTermState] = useState(initialSearchTerm);
  const [date, setDateState] = useState<string | null>(initialDate);

  const setPlace = useCallback(
    (newPlace: string, newLabel: string, newPlaceType: PlaceType = "region") => {
      setPlaceState(newPlace);
      setLabelState(newLabel);
      setPlaceTypeState(newPlaceType);
    },
    []
  );

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const setDate = useCallback((newDate: string | null) => {
    setDateState(newDate);
  }, []);

  return (
    <HeroContext.Provider value={{ place, label, placeType, searchTerm, date, setPlace, setSearchTerm, setDate }}>
      {children}
    </HeroContext.Provider>
  );
}

export function useHero() {
  const context = useContext(HeroContext);
  if (context === undefined) {
    throw new Error("useHero must be used within a HeroProvider");
  }
  return context;
}
