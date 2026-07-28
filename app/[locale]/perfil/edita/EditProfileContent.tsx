"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@components/hooks/useAuth";
import { getSafeRedirect } from "@utils/safe-redirect";
import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";
import EditProfileAuthGate from "./EditProfileAuthGate";
import EditProfileForm from "./EditProfileForm";

export default function EditProfileContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect") ?? undefined);

  if (isLoading) {
    return <AuthCheckSkeleton />;
  }

  if (!isAuthenticated) {
    return <EditProfileAuthGate redirectTo={redirectTo} />;
  }

  return <EditProfileForm redirectTo={redirectTo} />;
}
