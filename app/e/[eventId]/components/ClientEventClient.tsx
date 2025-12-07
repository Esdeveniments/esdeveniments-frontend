"use client";

import dynamic from "next/dynamic";
import type { EventDetailResponseDTO } from "types/api/event";
import type { EventTemporalStatus } from "types/event-status";
import { retryDynamicImport } from "@utils/dynamic-import-retry";

const EventClientDynamic = dynamic(
  () =>
    retryDynamicImport(() => import("../EventClient"), {
      retries: 3,
      retryDelayMs: 200,
    }),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function ClientEventClient({
  event,
  temporalStatus,
}: {
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
}) {
  return <EventClientDynamic event={event} temporalStatus={temporalStatus} />;
}


