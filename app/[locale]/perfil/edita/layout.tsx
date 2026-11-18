import type { ReactNode } from "react";
import RouteClientMessages from "@components/partials/RouteClientMessages";

export default function EditProfileLayout({ children }: { children: ReactNode }) {
  return <RouteClientMessages scope="editProfile">{children}</RouteClientMessages>;
}
