"use client";

import dynamic from "next/dynamic";
import type { ClientEventClientProps } from "types/props";

const EventClientDynamic = dynamic(() => import("../EventClient"), {
  ssr: false,
  loading: () => null,
});

export default function ClientEventClient({
  event,
}: ClientEventClientProps) {
  return <EventClientDynamic event={event} />;
}


