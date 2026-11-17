import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function EventLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="event">{children}</RouteClientMessages>;
}
