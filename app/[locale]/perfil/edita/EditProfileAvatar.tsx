"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@components/hooks/useAuth";
import { useRouter } from "@i18n/routing";
import AvatarInitials from "@components/ui/common/AvatarInitials";
import { sendGoogleEvent } from "@utils/analytics";
import {
  AVATAR_MAX_DIMENSION,
  AVATAR_MIN_DIMENSION,
  IMAGE_UPLOAD_ACCEPT,
  MAX_AVATAR_BYTES,
} from "@utils/constants";
import { imageUploadErrorMessage, loadAndPrepareImage } from "@utils/image-upload";
import type { EditProfileAvatarProps } from "types/props";
import type { ImageUploadResult } from "types/upload";

export default function EditProfileAvatar({
  className,
}: EditProfileAvatarProps) {
  const t = useTranslations("App.EditProfile.avatar");
  const tImage = useTranslations("Components.ImageUploader");
  const router = useRouter();
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
    sendGoogleEvent("avatar_upload_start", {});
    setIsUploading(true);
    try {
      // Phones hand over 5-12 MB photos, HEIC on iOS and WebP or a blank type
      // on Android; the route only takes a JPEG or PNG under 2 MB.
      let prepared: ImageUploadResult;
      try {
        prepared = await loadAndPrepareImage(file, {
          maxBytes: MAX_AVATAR_BYTES,
          maxDimension: AVATAR_MAX_DIMENSION,
          minDimension: AVATAR_MIN_DIMENSION,
        });
      } catch {
        prepared = { ok: false, reason: "encode_failed", detectedType: null };
      }
      if (!prepared.ok) {
        setError(imageUploadErrorMessage(tImage, prepared.reason, MAX_AVATAR_BYTES));
        sendGoogleEvent("avatar_upload_blocked", {
          reason: prepared.reason,
          detected_type: prepared.detectedType ?? "unknown",
        });
        return;
      }
      try {
        const formData = new FormData();
        formData.append("avatarFile", prepared.file);
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
      } catch {
        setError(t("errorUploadFailed"));
        sendGoogleEvent("avatar_upload_error", { reason: "upload_failed" });
        return;
      }

      // Mutation succeeded — fire success and resync the session outside the
      // upload's own try/catch, so a refetchUser() failure (session resync,
      // not the upload) can't get reported as an upload error. Stays inside
      // the outer finally so isUploading doesn't clear until the resync is
      // done, or a second upload could race the first one's session refresh.
      sendGoogleEvent("avatar_upload_success", {});
      await refetchUser();
      // Drop cached pages (staleTimes) so the profile shows the new avatar.
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    setError(null);
    sendGoogleEvent("avatar_remove_start", {});
    setIsRemoving(true);
    try {
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
      } catch {
        setError(t("errorRemoveFailed"));
        sendGoogleEvent("avatar_remove_error", {});
        return;
      }

      // Same ordering and busy-state rationale as handleFileChange above.
      sendGoogleEvent("avatar_remove_success", {});
      await refetchUser();
      router.refresh();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      role="group"
      aria-labelledby="avatar-label"
      aria-describedby="avatar-hint"
      className={`w-full ${className ?? ""}`}
    >
      <p id="avatar-label" className="form-label">
        {t("label")}
      </p>
      <div className="mt-2 flex items-center gap-element-gap">
        {avatarUrl ? (
          // bg-background: a transparent-background upload (e.g. a logo) should
          // show against a neutral backdrop, not whatever's behind it.
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not eligible for static optimization
          <img
            src={avatarUrl}
            alt={t("altPreview")}
            className="w-20 h-20 shrink-0 rounded-full object-cover bg-background"
          />
        ) : (
          <AvatarInitials name={displayName} />
        )}
        <div className="flex flex-col gap-element-gap-sm">
          <div className="flex flex-wrap gap-element-gap-sm">
            <button
              type="button"
              className="btn-neutral btn-sm"
              onClick={handleSelectClick}
              disabled={busy}
            >
              {isUploading ? t("uploading") : t("uploadButton")}
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="btn-neutral btn-sm"
                onClick={() => {
                  void handleRemove();
                }}
                disabled={busy}
              >
                {isRemoving ? t("removing") : t("removeButton")}
              </button>
            )}
          </div>
          <p id="avatar-hint" className="form-helper">
            {tImage("formatHelper")}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
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
