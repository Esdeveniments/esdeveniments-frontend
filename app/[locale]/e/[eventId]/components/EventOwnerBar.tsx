"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@components/hooks/useAuth";
import { isEventOwner } from "@utils/event-helpers";
import type { EventOwnerBarProps } from "types/props";

// Owners are a tiny share of views: keep the menu, dialogs and their
// positioning code out of the event page bundle.
const EventOwnerTools = dynamic(() => import("./EventOwnerTools"), { ssr: false });

/**
 * The check runs on the client with the session AuthProvider already loaded, so
 * a page view makes no extra backend call. The server checks ownership again on
 * each action.
 */
export default function EventOwnerBar({ ownerId, slug, shareEvent }: EventOwnerBarProps) {
  const { user } = useAuth();
  if (!isEventOwner(user?.id, ownerId)) return null;
  return <EventOwnerTools slug={slug} shareEvent={shareEvent} />;
}
