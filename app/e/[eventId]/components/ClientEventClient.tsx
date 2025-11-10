"use client";

import dynamic from "next/dynamic";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";

const EventClientDynamic = dynamic(() => import("../EventClient"), {
  ssr: false,
  loading: () => null,
});

export default function ClientEventClient({
  event,
  temporalStatus,
}: {
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
}) {
  return <EventClientDynamic event={event} temporalStatus={temporalStatus} />;
}


