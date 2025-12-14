import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import UploadIcon from "@heroicons/react/outline/UploadIcon";
import { AcceptedImageTypes, ImageUploaderProps } from "types/props";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_ORIGINAL_LIMIT_LABEL,
} from "@utils/constants";
import { compressImageIfNeeded } from "@utils/image-optimizer";
import { normalizeUrl } from "@utils/string-helpers";

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onUpload,
  progress,
  isUploading = false,
  uploadMessage,
  mode = "upload",
  onModeChange,
  imageUrlValue = "",
  onImageUrlChange,
  imageUrlError,
}) => {
  const t = useTranslations("Components.ImageUploader");
  const fileSelect = useRef<HTMLInputElement>(null);
  const [imgData, setImgData] = useState<string | null>(value || imageUrlValue || null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);

  useEffect(() => {
    setImgData(value || imageUrlValue || null);
  }, [value, imageUrlValue]);

  const isUploadMode = mode === "upload";

  const resetMessages = () => {
    setError(null);
    setStatus(null);
    setLocalUrlError(null);
  };

  const handleModeSwitch = (nextMode: "upload" | "url") => {
    if (nextMode === mode) return;
    resetMessages();
    setDragOver(false);
    if (nextMode === "url") {
      onUpload(null);
      setImgData(imageUrlValue || null);
    } else {
      setImgData(value || null);
    }
    onModeChange?.(nextMode);
  };

  const handleImageUrlInput = (value: string) => {
    resetMessages();
    onImageUrlChange?.(value);
  };

  const handleImageUrlBlur = () => {
    if (!onImageUrlChange) return;
    const normalized = normalizeUrl(imageUrlValue || "");
    if (!normalized) {
      setLocalUrlError(t("imageUrlInvalid"));
      return;
    }
    onImageUrlChange(normalized);
    setImgData(normalized);
  };

  async function handleImageUpload(): Promise<void> {
    if (fileSelect.current) {
      fileSelect.current.click();
    }
  }

  function handleFileValidation(file: File): boolean {
    const acceptedImageTypes: AcceptedImageTypes[] = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    if (!acceptedImageTypes.includes(file.type as AcceptedImageTypes)) {
      setError(t("unsupported"));
      return false;
    }

    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      setError(t("originalTooLarge", { limit: MAX_ORIGINAL_LIMIT_LABEL }));
      return false;
    }

    return true;
  }

  const tryPrepareFile = async (file: File): Promise<File | null> => {
    if (!handleFileValidation(file)) {
      return null;
    }

    resetMessages();
    let workingFile = file;

    if (file.size > MAX_TOTAL_UPLOAD_BYTES) {
      setIsOptimizing(true);
      try {
        const optimized = await compressImageIfNeeded(file, {
          maxBytes: MAX_TOTAL_UPLOAD_BYTES,
        });

        if (optimized) {
          workingFile = optimized;
        }
      } catch (compressionError) {
        console.error("Image optimization failed", compressionError);
        setError(t("compressFailed"));
        return null;
      } finally {
        setIsOptimizing(false);
      }
    }

    if (workingFile.size > MAX_TOTAL_UPLOAD_BYTES) {
      setError(t("tooLarge", { limit: MAX_UPLOAD_LIMIT_LABEL }));
      return null;
    }

    return workingFile;
  };

  const onChangeImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!isUploadMode) return;
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const preparedFile = await tryPrepareFile(file);
    if (preparedFile) {
      updateImage(preparedFile);
      onUpload(preparedFile);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>
  ): Promise<void> => {
    if (!isUploadMode) {
      setDragOver(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) {
      return;
    }
    const preparedFile = await tryPrepareFile(file);
    if (preparedFile) {
      updateImage(preparedFile);
      onUpload(preparedFile);
    }
  };

  const updateImage = (file: File): void => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgData(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImgData(null);
    resetMessages();
    if (fileSelect.current) {
      fileSelect.current.value = "";
    }
    onUpload(null);
    onImageUrlChange?.("");
  };

  const isRemoteUploading = progress > 0 && progress < 100;
  const displayedError = error || localUrlError || imageUrlError || null;
  const isInteractionDisabled = isOptimizing || isUploading || isRemoteUploading;

  return (
    <div className="w-full text-foreground-strong">
      <label htmlFor="image" className="form-label">
        {t("label")}
      </label>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className={`px-4 py-2.5 rounded-button font-medium text-sm transition-all ${isUploadMode
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground hover:bg-border"
            }`}
          onClick={() => handleModeSwitch("upload")}
          aria-pressed={isUploadMode}
        >
          {t("uploadMode")}
        </button>
        <button
          type="button"
          className={`px-4 py-2.5 rounded-button font-medium text-sm transition-all ${!isUploadMode
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground hover:bg-border"
            }`}
          onClick={() => handleModeSwitch("url")}
          aria-pressed={!isUploadMode}
        >
          {t("urlMode")}
        </button>
      </div>

      {isUploadMode && (
        <div
          className={`mt-3 border-2 border-dashed rounded-card ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            } ${isInteractionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} transition-all`}
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
        >
          <div className="flex-center flex-col gap-3 p-8 text-center">
            {progress === 0 ? (
              <>
                <UploadIcon className="w-10 h-10 text-foreground/50" />
                <p className="body-normal text-foreground/70">
                  {t("uploadDropCta")}
                </p>
                <p className="body-small text-foreground/50">
                  {t("uploadDropHelper")}
                </p>
                {/* Clear CTA Button */}
                <span className="inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wide rounded-button px-6 py-3 bg-primary text-primary-foreground min-h-[44px]">
                  {t("selectButton")}
                </span>
                <p className="body-small text-foreground/50 mt-1">
                  {t("formatHelper")}
                </p>
              </>
            ) : (
              <span className="body-normal text-foreground-strong">
                {t("progress", { progress })}
              </span>
            )}

            <input
              ref={fileSelect}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style={{ display: "none" }}
              onChange={(event) => {
                void onChangeImage(event);
              }}
              disabled={isInteractionDisabled}
            />
          </div>
        </div>
      )}
      {!isUploadMode && (
        <div className="mt-3 space-y-3">
          <label
            htmlFor="image-url"
            className="w-full form-label"
          >
            {t("imageUrlLabel")}
          </label>
          <input
            id="image-url"
            type="text"
            value={imageUrlValue}
            placeholder={t("imageUrlPlaceholder")}
            onChange={(event) => handleImageUrlInput(event.target.value)}
            onBlur={handleImageUrlBlur}
            className="input min-h-[44px]"
          />
          <p className="form-helper">
            {t("imageUrlHelper")}
          </p>
        </div>
      )}
      {isOptimizing && (
        <p className="text-sm text-foreground/70 mt-2">
          {t("optimizing", { limit: MAX_UPLOAD_LIMIT_LABEL })}
        </p>
      )}
      {progress > 0 && (
        <div className="w-full mt-3">
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-foreground/70 mt-1">
            {progress >= 100
              ? t("uploadSuccess")
              : t("uploading", { progress })}
          </p>
        </div>
      )}
      {status && (
        <p className="text-sm text-foreground/80 mt-2" data-testid="image-upload-status">
          {status}
        </p>
      )}
      {uploadMessage && (
        <p className="text-sm text-foreground/80 mt-2">{uploadMessage}</p>
      )}
      {displayedError && <p className="text-primary text-sm mt-2">{displayedError}</p>}
      {imgData && (imgData.startsWith("http") || imgData.startsWith("data:") || imgData.startsWith("/")) ? (
        <div className="flex justify-center items-start p-4">
          <button
            onClick={handleRemoveImage}
            className="bg-background rounded-full p-1 hover:bg-primary"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-foreground-strong hover:text-background"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <Image
            alt={t("altPreview")}
            height={100}
            width={100}
            className="object-contain"
            src={imgData}
            style={{
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

ImageUploader.displayName = "ImageUploader";

export default ImageUploader;
