import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function PlaceLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="listing">{children}</RouteClientMessages>;
}
