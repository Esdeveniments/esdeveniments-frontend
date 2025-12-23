import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ListEvent } from "types/api/event";

const EventsMap: ComponentType<{
  events: ListEvent[];
  datasetKey?: string;
  placeContext?: string;
}> = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-muted rounded-card animate-pulse flex items-center justify-center border border-border">
      <span className="text-foreground/60 font-medium">Loading map...</span>
    </div>
  ),
});

export default EventsMap;


