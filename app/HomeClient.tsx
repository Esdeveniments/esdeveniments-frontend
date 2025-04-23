"use client";
import EventsCategorized from "@components/ui/eventsCategorized";
import { useEffect } from "react";
import { initializeStore } from "@utils/initializeStore";
import type { HomeInitialState, PageData } from "types/common";

export default function HomeClient({ initialState, pageData }: { initialState: HomeInitialState; pageData: PageData }) {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return <EventsCategorized pageData={pageData} />;
}
