"use client";

import dynamic from "next/dynamic";

/**
 * Lazy-loaded wrapper for SocialFollowPopup.
 * The popup is purely client-side (scroll + timer trigger) so we
 * skip SSR entirely to keep the server bundle lean.
 */
const SocialFollowPopup = dynamic(
  () => import("@components/ui/common/social/SocialFollowPopup"),
  { ssr: false },
);

export default function LazySocialFollowPopup() {
  return <SocialFollowPopup />;
}
