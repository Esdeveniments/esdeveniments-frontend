"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import {
  StarIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { SPONSOR_BANNER_IMAGE } from "@utils/constants";
import type {
  SponsorImageUploadResult,
  SponsorImageValidation,
  SponsorImageWarning,
} from "types/sponsor";

/**
 * Validate image dimensions against sponsor banner recommendations.
 * Returns warnings but doesn't block upload - this is soft validation.
 */
function validateImageDimensions(
  width: number,
  height: number
): SponsorImageValidation {
  const aspectRatio = width / height;
  const warnings: SponsorImageWarning[] = [];

  // Check minimum dimensions
  if (
    width < SPONSOR_BANNER_IMAGE.MIN_WIDTH ||
    height < SPONSOR_BANNER_IMAGE.MIN_HEIGHT
  ) {
    warnings.push({
      type: "tooSmall",
      context: {
        minWidth: SPONSOR_BANNER_IMAGE.MIN_WIDTH,
        minHeight: SPONSOR_BANNER_IMAGE.MIN_HEIGHT,
      },
    });
  }

  // Check if too tall (portrait or square images)
  if (height > SPONSOR_BANNER_IMAGE.MAX_HEIGHT) {
    warnings.push({
      type: "tooTall",
      context: { maxHeight: SPONSOR_BANNER_IMAGE.MAX_HEIGHT },
    });
  }

  // Check aspect ratio
  if (
    aspectRatio < SPONSOR_BANNER_IMAGE.MIN_ASPECT_RATIO ||
    aspectRatio > SPONSOR_BANNER_IMAGE.MAX_ASPECT_RATIO
  ) {
    warnings.push({
      type: "wrongRatio",
      context: {
        current: aspectRatio.toFixed(1),
        recommended: SPONSOR_BANNER_IMAGE.IDEAL_ASPECT_RATIO,
      },
    });
  }

  return {
    isOptimal: warnings.length === 0,
    warnings,
    width,
    height,
    aspectRatio,
  };
}

export default function SponsorImageUpload({
  sessionId,
  placeSlug,
  placeName,
}: {
  sessionId: string;
  placeSlug?: string | null;
  placeName?: string | null;
}) {
  const t = useTranslations("Sponsorship");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SponsorImageUploadResult | null>(null);
  const [validation, setValidation] = useState<SponsorImageValidation | null>(
    null
  );

  const placeLabel = useMemo(() => {
    // Only show slug in parentheses if it's meaningfully different from the name
    if (placeName && placeSlug) {
      const normalizedName = placeName.toLowerCase().replace(/\s+/g, "-");
      // If slug matches normalized name, just show the name
      if (normalizedName === placeSlug) {
        return placeName;
      }
      return `${placeName} (/${placeSlug})`;
    }
    if (placeName) return placeName;
    if (placeSlug) return `/${placeSlug}`;
    return null;
  }, [placeName, placeSlug]);

  /**
   * Process a selected file - validate dimensions and create preview
   */
  const processFile = useCallback((selectedFile: File | null) => {
    // Clean up previous preview
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(selectedFile);
    setValidation(null);
    setError(null);
    setPreview(null);

    if (!selectedFile) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);

    // Read image dimensions for validation
    const img = new Image();
    img.onload = () => {
      const result = validateImageDimensions(img.width, img.height);
      setValidation(result);
    };
    img.onerror = () => {
      setError(t("upload.errors.invalidImage"));
    };
    img.src = previewUrl;
  }, [preview, t]);

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFile(e.target.files?.[0] ?? null);
    },
    [processFile]
  );

  /**
   * Handle drag and drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type.startsWith("image/")) {
      processFile(droppedFile);
    }
  }, [processFile]);

  /**
   * Clear selected file
   */
  const clearFile = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setValidation(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [preview]);

  const upload = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("imageFile", file, file.name || "sponsor-image");

      const xhr = new XMLHttpRequest();
      const promise = new Promise<SponsorImageUploadResult>((resolve, reject) => {
        xhr.open("POST", "/api/sponsors/image-upload");
        xhr.responseType = "text";
        xhr.timeout = 30000; // 30 second timeout for image upload

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        };

        xhr.onload = () => {
          const text = typeof xhr.response === "string" ? xhr.response : "";
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(text) as SponsorImageUploadResult;
              const isValid =
                parsed &&
                parsed.success === true &&
                typeof parsed.url === "string" &&
                typeof parsed.publicId === "string" &&
                typeof parsed.metadataSaved === "boolean";
              if (isValid) {
                resolve(parsed);
              } else {
                reject(new Error("invalid_response"));
              }
            } catch {
              reject(new Error("invalid_response"));
            }
            return;
          }

          // Try to parse structured error response
          try {
            const parsed = text ? JSON.parse(text) : null;
            const code = parsed?.errorCode;
            reject(new Error(typeof code === "string" ? code : "upload_failed"));
            return;
          } catch {
            reject(new Error("upload_failed"));
          }
        };

        xhr.onerror = () => reject(new Error("upload_failed"));
        xhr.ontimeout = () => reject(new Error("upload_failed"));

        xhr.send(formData);
      });

      const uploaded = await promise;
      setResult(uploaded);
      setProgress(100);
    } catch (e) {
      const code = e instanceof Error ? e.message : "upload_failed";
      const errorMap: Record<string, string> = {
        not_paid: t("upload.errors.notPaid"),
        invalid_product: t("upload.errors.invalidSession"),
        missing_session: t("upload.errors.missingFields"),
        missing_image: t("upload.errors.missingFields"),
        image_too_large: t("upload.errors.tooLarge"),
      };
      setError(errorMap[code] || t("upload.errors.generic"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with location */}
      <div className="text-center space-y-4">
        <div>
          <h3 className="heading-3 mb-2">{t("upload.title")}</h3>
          <p className="body-normal text-foreground/70">{t("upload.subtitle")}</p>
        </div>

        {/* Location badge */}
        {placeLabel && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-badge">
            <MapPinIcon className="w-4 h-4 text-primary" />
            <span className="body-small text-foreground">
              <strong>{placeLabel}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="card-bordered card-body">
        {result ? (
          /* Success state */
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-card">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="body-normal font-medium text-green-800">
                  {t("upload.success.title")}
                </p>
                <p className="body-small text-green-700">
                  {result.metadataSaved
                    ? t("upload.success.saved")
                    : t("upload.success.notSaved")}
                </p>
              </div>
            </div>

            {/* Preview uploaded image */}
            <div className="rounded-card border border-border bg-muted/20 overflow-hidden">
              <p className="body-small text-foreground/60 px-3 py-2 border-b border-border bg-muted/30">
                {t("upload.previewAlt")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt={t("upload.previewAlt")}
                className="w-full max-h-48 object-contain bg-background p-4"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => router.push("/patrocina/success")}
              >
                {t("upload.doneCta")}
              </button>
              <button
                type="button"
                className="btn-outline w-full"
                onClick={() => {
                  setResult(null);
                  clearFile();
                }}
              >
                {t("upload.changeCta")}
              </button>
            </div>
          </div>
        ) : (
          /* Upload state */
          <div className="space-y-5">
            {/* Drag & Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-card p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
                }
                ${isUploading ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                disabled={isUploading}
              />

              {preview ? (
                /* Preview selected image */
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={t("upload.previewAlt")}
                    className="max-h-32 mx-auto object-contain rounded"
                  />
                  <p className="body-small text-foreground/70">{file?.name}</p>
                  {validation && (
                    <p className="body-small text-foreground/50">
                      {validation.width}×{validation.height}px ({validation.aspectRatio.toFixed(1)}:1)
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="body-small text-primary hover:underline"
                  >
                    {t("upload.changeCta")}
                  </button>
                </div>
              ) : (
                /* Empty state */
                <div className="space-y-3">
                  <CloudArrowUpIcon className="w-12 h-12 text-foreground/30 mx-auto" />
                  <div>
                    <p className="body-normal text-foreground/70">
                      {t("upload.dropzone.title")}
                    </p>
                    <p className="body-small text-foreground/50 mt-1">
                      {t("upload.dropzone.formats")}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 body-small text-foreground/50">
                    <span className="flex items-center gap-1">
                      <StarIcon className="w-3.5 h-3.5 text-primary" />
                      {t("upload.dropzone.optimal")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                      {t("upload.dropzone.minimum")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Validation warnings */}
            {validation && !validation.isOptimal && (
              <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-card">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="body-small font-medium text-amber-800">
                    {t("upload.validation.warning")}
                  </p>
                  <ul className="body-small text-amber-700 space-y-0.5">
                    {validation.warnings.map((w) => (
                      <li key={w.type}>
                        • {t(`upload.validation.${w.type}`, w.context)}
                      </li>
                    ))}
                  </ul>
                  <p className="body-small text-amber-600">
                    {t("upload.validation.canContinue")}
                  </p>
                </div>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={upload}
              disabled={!file || isUploading}
              className={`
                btn-primary w-full flex items-center justify-center gap-2 mt-2
                ${!file || isUploading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("upload.uploading")}
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-5 h-5" />
                  {t("upload.cta")}
                </>
              )}
            </button>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-muted rounded-badge overflow-hidden">
                  <div
                    className="h-2 bg-primary transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="body-small text-foreground/60 text-center">
                  {t("upload.progress", { percent: progress })}
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-card">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="body-small text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

