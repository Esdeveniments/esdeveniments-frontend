"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@components/hooks/useAuth";
import { getSafeRedirect } from "@utils/safe-redirect";
import EditProfileAuthGate from "./EditProfileAuthGate";
import EditProfileForm from "./EditProfileForm";

export default function EditProfileContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect") ?? undefined);

  if (isLoading) {
    return (
      <div className="container flex-center pt-[6rem] pb-section-y">
        <div className="w-full max-w-md h-80 rounded-lg bg-border/40 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <EditProfileAuthGate redirectTo={redirectTo} />;
  }

  return <EditProfileForm redirectTo={redirectTo} />;
}
