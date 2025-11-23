"use client";

import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { PlacePageSkeleton } from "@components/ui/common/skeletons";
import type { FilterLoadingGateProps } from "types/props";

export default function FilterLoadingGate({
  children,
}: FilterLoadingGateProps) {
  const { isLoading } = useFilterLoading();

  if (isLoading) {
    return <PlacePageSkeleton />;
  }

  return <>{children}</>;
}
