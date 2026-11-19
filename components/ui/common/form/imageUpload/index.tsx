/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ImageUploaderProps } from "types/props";
import type { PosterImageFailure } from "types/upload";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_ORIGINAL_LIMIT_LABEL,
  POSTER_IMAGE_ACCEPT,
} from "@utils/constants";
import { isBackendImageType } from "@utils/image-validation";
import { preparePosterImage } from "@utils/image-optimizer";
import { sendGoogleEvent } from "@utils/analytics";

const MB = 1024 * 1024;

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value, onUpload, onPreparingChange,
}) => {
  const t = useTranslations("Components.ImageUploader");
  const fileSelect = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const selectionVersionRef = useRef(0);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  // Set only by user actions, so a restored draft never steals focus.
  const pendingFocusRef = useRef<"dropzone" | "change" | null>(null);
  const onPreparingChangeRef = useRef(onPreparingChange);
  useEffect(() => {
    onPreparingChangeRef.current = onPreparingChange;
  });

  useEffect(() => () => {
    selectionVersionRef.current += 1;
    onPreparingChangeRef.current?.(false);
  }, []);

  const hasPreview = Boolean(
    value && (value.startsWith("http") || value.startsWith("data:") || value.startsWith("/"))
  );

  const resetMessages = () => {
    setError(null);
    setStatus(null);
  };

  async function handleImageUpload(): Promise<void> {
    if (fileSelect.current) {
      fileSelect.current.click();
    }
  }

  const prepareFile = async (file: File): Promise<void> => {
    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      setError(t("originalTooLarge", { limit: MAX_ORIGINAL_LIMIT_LABEL }));
      sendGoogleEvent("poster_image_blocked", {
        reason: "original_too_large",
        size_mb: Math.round(file.size / MB),
      });
      return;
    }
    const version = ++selectionVersionRef.current;
    resetMessages();
    setIsPreparing(true);
    onPreparingChange?.(true);
    setIsOptimizing(file.size > MAX_TOTAL_UPLOAD_BYTES || !isBackendImageType(file.type));
    try {
      const result = await preparePosterImage(file, { maxBytes: MAX_TOTAL_UPLOAD_BYTES });
      if (version !== selectionVersionRef.current) return;
      if (!result.ok) {
        setError(failureMessage(result.reason));
        sendGoogleEvent("poster_image_blocked", {
          reason: result.reason,
          detected_type: result.detectedType ?? "unknown",
          file_type: file.type || "blank",
          size_mb: Math.round(file.size / MB),
        });
        return;
      }
      sendGoogleEvent("poster_image_prepared", {
        detected_type: result.detectedType ?? "unknown",
        converted: result.file !== file,
        size_mb: Math.round(file.size / MB),
      });
      // Replacing via Change keeps that button mounted, so only the first upload moves focus.
      if (!hasPreview) pendingFocusRef.current = "change";
      onUpload(result.file);
    } catch (preparationError) {
      console.error("Image preparation failed", preparationError);
      if (version === selectionVersionRef.current) setError(t("compressFailed"));
    } finally {
      if (version === selectionVersionRef.current) {
        setIsPreparing(false);
        setIsOptimizing(false);
        onPreparingChange?.(false);
      }
    }
  };

  function failureMessage(reason: PosterImageFailure): string {
    switch (reason) {
      case "too_large":
        return t("tooLarge", { limit: MAX_UPLOAD_LIMIT_LABEL });
      case "heic_undecodable":
        return t("heicUnsupported");
      case "encode_failed":
        return t("compressFailed");
      default:
        return t("unreadable");
    }
  }

  const onChangeImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || isPreparing) {
      return;
    }
    await prepareFile(file);
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file || isPreparing) {
      return;
    }
    await prepareFile(file);
  };

  const handleRemoveImage = () => {
    selectionVersionRef.current += 1;
    setIsPreparing(false);
    setIsOptimizing(false);
    onPreparingChange?.(false);
    resetMessages();
    if (fileSelect.current) {
      fileSelect.current.value = "";
    }
    pendingFocusRef.current = "dropzone";
    onUpload(null);
  };

  const isInteractionDisabled = isPreparing;

  useEffect(() => {
    const target = pendingFocusRef.current === "change" && hasPreview ? changeButtonRef.current
      : pendingFocusRef.current === "dropzone" && !hasPreview ? dropzoneRef.current
      : null;
    if (!target) return;
    pendingFocusRef.current = null;
    target.focus();
  }, [hasPreview]);

  return (
    <div className="w-full">
      <span id="image-label" className="form-label block">
        {t("label")}
      </span>
      <input
        ref={fileSelect}
        id="image"
        type="file"
        accept={POSTER_IMAGE_ACCEPT}
        className="hidden"
        aria-labelledby="image-label"
        onChange={(event) => {
          void onChangeImage(event);
        }}
        disabled={isInteractionDisabled}
      />

      {hasPreview && value ? (
        <div className="relative mt-2 overflow-hidden rounded-card border border-border bg-muted">
          <img
            alt={t("altPreview")}
            src={value}
            className="mx-auto max-h-72 w-auto object-contain"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              ref={changeButtonRef}
              type="button"
              className="btn-neutral bg-background shadow-sm"
              onClick={() => void handleImageUpload()}
              disabled={isInteractionDisabled}
            >
              {t("change")}
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label={t("remove")}
              className="flex-center h-button w-button rounded-full bg-background text-foreground shadow-sm hover:bg-muted focus-ring"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={dropzoneRef}
          className={`mt-2 border-2 border-dashed rounded-card ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40"
            } ${isInteractionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} transition-colors focus-ring`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            void handleDrop(event);
          }}
          onClick={() => {
            if (isInteractionDisabled) return;
            void handleImageUpload();
          }}
          onKeyDown={(event) => {
            if (isInteractionDisabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void handleImageUpload();
            }
          }}
          role="button"
          tabIndex={isInteractionDisabled ? -1 : 0}
          aria-disabled={isInteractionDisabled}
          aria-labelledby="image-label image-action"
          aria-describedby="image-format"
        >
          <div className="flex-center flex-col gap-2 p-6 text-center">
            <PhotoIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <span id="image-action" className="btn-neutral">{t("selectButton")}</span>
            <p className="hidden md:block body-small text-muted-foreground">
              {t("uploadDropCta")}
            </p>
            <p id="image-format" className="body-small text-muted-foreground">
              {t("formatHelper")}
            </p>
          </div>
        </div>
      )}
      {isOptimizing && (
        <p className="helper-text" role="status">
          {t("optimizing")}
        </p>
      )}
      {status && (
        <p className="helper-text" data-testid="image-upload-status">
          {status}
        </p>
      )}
      {error && (
        <p className="helper-text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

ImageUploader.displayName = "ImageUploader";

export default ImageUploader;
