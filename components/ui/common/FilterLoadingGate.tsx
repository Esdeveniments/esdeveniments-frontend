"use client";

import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { EventsListSkeleton } from "@components/ui/common/skeletons";
import type { FilterLoadingGateProps } from "types/props";

export default function FilterLoadingGate({
  children,
}: FilterLoadingGateProps) {
  const { isLoading } = useFilterLoading();

  if (isLoading) {
    return <EventsListSkeleton />;
  }

  return <>{children}</>;
}
