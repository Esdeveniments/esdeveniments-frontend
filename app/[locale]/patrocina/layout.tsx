import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function SponsorshipLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="sponsorship">{children}</RouteClientMessages>;
}
