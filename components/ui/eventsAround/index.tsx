import { useEffect, useState, FC } from "react";
import { captureException } from "@sentry/nextjs";
import { sendGoogleEvent } from "@utils/analytics";
import EventsAroundScroll from "@components/ui/eventsAroundScroll";

import type { EventSummaryResponseDTO } from "types/api/event";
import type { EventsAroundProps } from "types/common";

const EventsAround: FC<EventsAroundProps> = ({ id, title, town, region }) => {
  const [events, setEvents] = useState<EventSummaryResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sendGoogleEvent("view_events_around_component", {});

    const fetchEvents = async () => {
      try {
        const response = await fetch(
          `/api/getEventsAround?id=${id}&title=${title}&town=${town}&region=${region}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        sendGoogleEvent("view_events_around_data", {});
        if (data.error) {
          // Handle case where API explicitly returns an error
          throw new Error(data.error);
        }

        setEvents(data.events || []);
      } catch (error) {
        const errorMessage = `Failed to fetch around events for "${id} ${title} ${town}, ${region}": ${error}`;
        console.error(errorMessage);
        setError(
          "Ho sentim, però no hem pogut carregar els esdeveniments en aquest moment."
        );
        captureException(new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [town, region, id, title]);

  if (error) {
    return <div>{error}</div>;
  }

  return <EventsAroundScroll events={events} loading={loading} />;
};

export default EventsAround;
