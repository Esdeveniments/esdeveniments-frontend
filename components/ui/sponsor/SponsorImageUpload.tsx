"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import type { SponsorImageUploadResult } from "types/sponsor";

export default function SponsorImageUpload({
  sessionId,
  placeSlug,
  placeName,
}: {
  sessionId: string;
  placeSlug?: string | null;
  placeName?: string | null;
}) {
  const t = useTranslations("Patrocina");
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SponsorImageUploadResult | null>(null);

  const placeLabel = useMemo(() => {
    if (placeName && placeSlug) return `${placeName} (/${placeSlug})`;
    if (placeName) return placeName;
    if (placeSlug) return `/${placeSlug}`;
    return null;
  }, [placeName, placeSlug]);

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
      if (code === "not_paid") setError(t("upload.errors.notPaid"));
      else if (code === "invalid_product") setError(t("upload.errors.invalidSession"));
      else if (code === "missing_session" || code === "missing_image")
        setError(t("upload.errors.missingFields"));
      else if (code === "image_too_large") setError(t("upload.errors.tooLarge"));
      else setError(t("upload.errors.generic"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card-bordered card-body max-w-2xl mx-auto">
      <h3 className="heading-3 mb-2">{t("upload.title")}</h3>
      <p className="body-normal text-foreground/70 mb-4">{t("upload.subtitle")}</p>

      {placeLabel && (
        <p className="body-small text-foreground/60 mb-4">
          📍 {t("upload.place")}:{" "}
          <span className="text-foreground font-medium">{placeLabel}</span>
        </p>
      )}

      {result ? (
        <div className="space-y-3">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-card">
            <p className="body-normal">{t("upload.success.title")}</p>
            <p className="body-small text-foreground/70 mt-1">
              {result.metadataSaved
                ? t("upload.success.saved")
                : t("upload.success.notSaved")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-card border border-border bg-muted/20 overflow-hidden">
              {/* This is a post-payment preview, not a performance-critical/LCP image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt={t("upload.previewAlt")}
                className="w-full max-h-64 object-contain bg-background"
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
                  setFile(null);
                  setProgress(0);
                  setError(null);
                }}
              >
                {t("upload.changeCta")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-foreground/80 file:btn-outline file:mr-3 file:py-2 file:px-4 file:rounded-button file:border-0"
            disabled={isUploading}
          />

          <button
            onClick={upload}
            disabled={!file || isUploading}
            className={`btn-primary w-full ${!file || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isUploading ? t("upload.uploading") : t("upload.cta")}
          </button>

          {isUploading && (
            <div className="w-full">
              <div className="w-full h-2 bg-muted rounded-badge overflow-hidden">
                <div
                  className="h-2 bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="body-small text-foreground/60 mt-2 text-center">
                {t("upload.progress", { percent: progress })}
              </p>
            </div>
          )}

          {error && (
            <p className="body-small text-red-500 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

