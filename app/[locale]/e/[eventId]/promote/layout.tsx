import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function EventPromoteLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="eventPromote">{children}</RouteClientMessages>;
}
