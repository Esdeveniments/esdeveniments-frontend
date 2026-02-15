"use client";

import dynamic from "next/dynamic";
import { usePathname } from "@i18n/routing";

/**
 * Lazy-loaded wrapper for SocialFollowPopup.
 * The popup is purely client-side (scroll + timer trigger) so we
 * skip SSR entirely to keep the server bundle lean.
 *
 * usePathname lives here (not inside the dynamic chunk) because
 * router-context subscriptions don't reliably propagate through
 * the React.lazy boundary created by next/dynamic + ssr:false.
 */
const SocialFollowPopup = dynamic(
  () => import("@components/ui/common/social/SocialFollowPopup"),
  { ssr: false },
);

export default function LazySocialFollowPopup() {
  const pathname = usePathname();
  return <SocialFollowPopup pathname={pathname} />;
}
