import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function EventEditLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="eventEdit">{children}</RouteClientMessages>;
}
