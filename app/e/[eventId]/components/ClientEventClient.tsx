"use client";

import dynamic from "next/dynamic";
import type { EventDetailResponseDTO } from "types/api/event";

const EventClientDynamic = dynamic(() => import("../EventClient"), {
  ssr: false,
  loading: () => null,
});

export default function ClientEventClient({
  event,
}: {
  event: EventDetailResponseDTO;
}) {
  return <EventClientDynamic event={event} />;
}


