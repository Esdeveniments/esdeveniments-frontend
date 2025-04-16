import axios, { AxiosResponse } from "axios";
import { captureException } from "@sentry/nextjs";
import { EventDetailResponseDTO } from "types/api/event";

interface Region {
  id: number;
  name: string;
  slug: string;
}

interface RegionsResponse {
  regions: Region[];
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function getEvent(eventId: string): Promise<AxiosResponse<EventDetailResponseDTO>> {
  try {
    const response = await axios.get<EventDetailResponseDTO>(`${apiUrl}/events/${eventId}`);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error occurred while fetching event: ${errorMessage}`);
    captureException(error, {
      extra: {
        context: "getEvent",
      },
    });
    throw new Error(`Error fetching event: ${errorMessage}`);
  }
}

export async function postEvent(event: EventDetailResponseDTO): Promise<AxiosResponse> {
  try {
    const response = await axios.post<EventDetailResponseDTO>(`${apiUrl}/events`, event);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error occurred while posting event: ${errorMessage}`);
    captureException(error, {
      extra: {
        context: "posting event",
      },
    });
    throw new Error(`Error posting event: ${errorMessage}`);
  }
}

export async function updateEvent(event: EventDetailResponseDTO): Promise<AxiosResponse> {
  try {
    const response = await axios.put<EventDetailResponseDTO>(`${apiUrl}/events`, event);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error occurred while updating event: ${errorMessage}`);
    captureException(error, {
      extra: {
        context: "updating event",
      },
    });
    throw new Error(`Error updating event: ${errorMessage}`);
  }
}

export async function getRegions(): Promise<{ [key: string]: Region }> {
  try {
    const response = await axios.get<RegionsResponse>(`${apiUrl}/regions`, {
      headers: {
        "Cache-Control": "max-age=3600",
      },
    });

    if (response.status !== 200) {
      const message = `API Error: ${response.status} ${response.statusText}`;
      console.error(message);
      captureException(new Error(message), {
        extra: {
          context: "fetching regions",
          status: response.status,
          statusText: response.statusText,
        },
      });
      throw new Error(message);
    }

    const data = response.data;

    const regionsMap: { [key: string]: Region } = {};
    if (Array.isArray(data.regions)) {
      data.regions.forEach((region) => {
        regionsMap[region.slug] = region;
      });
    }

    return regionsMap;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error occurred while fetching regions: ${errorMessage}`);
    captureException(error, {
      extra: {
        context: "fetching regions",
      },
    });
    return {};
  }
}
