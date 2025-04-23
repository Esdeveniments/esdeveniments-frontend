// Migrated from pages/e/[eventId]/edita/index.tsx
import { notFound } from "next/navigation";
import { fetchEventById, updateEventById } from "lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { useGetRegionsWithCities } from "components/hooks/useGetRegionsWithCities";
import { useState, useEffect, useMemo } from "react";
import { slug, getFormattedDate } from "@utils/helpers";
import {
  DatePicker,
  Input,
  Select,
  TextArea,
  ImageUpload,
} from "components/ui/common/form";
import Meta from "components/partials/seo-meta";
import { Notification } from "components/ui/common";
import { siteUrl } from "@config/index";
import type { FormState, FormData } from "types/event";
import type { Option } from "types/common";
import type { EventUpdateRequestDTO } from "types/api/event";
import type { EventTimeDTO } from "types/api/event";
import { editEvent } from "./actions";

// Helper: Metadata generation
export async function generateMetadata({
  params,
}: {
  params: { eventId: string };
}): Promise<Metadata> {
  const event = await fetchEventById(params.eventId);
  if (!event) return { title: "No event found" };
  return {
    title: `Edita: ${event.title}`,
    description: event.description,
    openGraph: {
      title: `Edita: ${event.title}`,
      description: event.description,
      url: `${siteUrl}/e/${params.eventId}/edita`,
      images: event.image ? [event.image] : [],
    },
  };
}

export default async function EditaPage({
  params,
}: {
  params: { eventId: string };
}) {
  const event: EventDetailResponseDTO | null = await fetchEventById(
    params.eventId
  );
  if (!event) return <div>No event found</div>;

  async function handleSubmit(formData: FormData) {
    "use server";
    // Convert FormData to your DTO
    const data: EventUpdateRequestDTO = {
      // ...extract fields from formData
    };
    await editEvent(event.id, data);
    // Optionally redirect or show a success message
  }

  // TODO: Migrate the rest of the Edita component logic here (UI, form, actions, etc.)
  return (
    <div>
      <h1>Edita: {event.title}</h1>
      {/* ...other UI... */}
    </div>
  );
}
