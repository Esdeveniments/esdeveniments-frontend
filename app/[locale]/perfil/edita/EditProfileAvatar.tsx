"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@components/hooks/useAuth";
import AvatarInitials from "@components/ui/common/AvatarInitials";
import { sendGoogleEvent } from "@utils/analytics";
import type { EditProfileAvatarProps } from "types/props";

// Mirrors the caps enforced server-side in app/api/users/me/avatar/route.ts.
// Checking here is UX only (fail before the upload round-trip) — the route
// is the real gate.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

export default function EditProfileAvatar({
  className,
}: EditProfileAvatarProps) {
  const t = useTranslations("App.EditProfile.avatar");
  const { user, refetchUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.name || user?.username || "";
  const avatarUrl = user?.avatarUrl;
  const busy = isUploading || isRemoving;

  const handleSelectClick = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError(t("errorUnsupported"));
      sendGoogleEvent("avatar_upload_error", { reason: "unsupported_type" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t("errorTooLarge"));
      sendGoogleEvent("avatar_upload_error", { reason: "too_large" });
      return;
    }

    sendGoogleEvent("avatar_upload_start", {});
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatarFile", file);
      const response = await fetch("/api/users/me/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        setError(t("errorUploadFailed"));
        sendGoogleEvent("avatar_upload_error", { reason: "upload_failed" });
        return;
      }
      await refetchUser();
      sendGoogleEvent("avatar_upload_success", {});
    } catch {
      setError(t("errorUploadFailed"));
      sendGoogleEvent("avatar_upload_error", { reason: "upload_failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    setError(null);
    setIsRemoving(true);
    try {
      const response = await fetch("/api/users/me/avatar", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError(t("errorRemoveFailed"));
        sendGoogleEvent("avatar_remove_error", {});
        return;
      }
      await refetchUser();
      sendGoogleEvent("avatar_remove_success", {});
    } catch {
      setError(t("errorRemoveFailed"));
      sendGoogleEvent("avatar_remove_error", {});
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={`w-full ${className ?? ""}`}>
      <label className="form-label">{t("label")}</label>
      <div className="mt-2 flex items-center gap-element-gap">
        {avatarUrl ? (
          // bg-background: a transparent-background upload (e.g. a logo) should
          // show against a neutral backdrop, not whatever's behind it.
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not eligible for static optimization
          <img
            src={avatarUrl}
            alt={t("altPreview")}
            className="w-20 h-20 rounded-full object-cover bg-background"
          />
        ) : (
          <AvatarInitials name={displayName} />
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="btn-outline btn-sm"
            onClick={handleSelectClick}
            disabled={busy}
          >
            {isUploading ? t("uploading") : t("uploadButton")}
          </button>
          {avatarUrl && (
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => {
                void handleRemove();
              }}
              disabled={busy}
            >
              {isRemoving ? t("removing") : t("removeButton")}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          className="hidden"
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />
      </div>
      {error && (
        <p className="helper-text-error mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
