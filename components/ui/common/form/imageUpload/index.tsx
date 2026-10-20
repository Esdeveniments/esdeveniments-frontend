/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpTrayIcon as UploadIcon } from "@heroicons/react/24/outline";
import { AcceptedImageTypes, ImageUploaderProps } from "types/props";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_ORIGINAL_LIMIT_LABEL,
} from "@utils/constants";
import { compressImageIfNeeded } from "@utils/image-optimizer";

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value, onUpload, onPreparingChange,
}) => {
  const t = useTranslations("Components.ImageUploader");
  const fileSelect = useRef<HTMLInputElement>(null);
  const [imgData, setImgData] = useState<string | null>(value || null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const selectionVersionRef = useRef(0);
  const previewReaderRef = useRef<FileReader | null>(null);
  const onPreparingChangeRef = useRef(onPreparingChange);
  onPreparingChangeRef.current = onPreparingChange;

  useEffect(() => () => {
    selectionVersionRef.current += 1;
    previewReaderRef.current?.abort();
    onPreparingChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    setImgData(value || null);
  }, [value]);

  const resetMessages = () => {
    setError(null);
    setStatus(null);
  };

  async function handleImageUpload(): Promise<void> {
    if (fileSelect.current) {
      fileSelect.current.click();
    }
  }

  function handleFileValidation(file: File): boolean {
    // The backend accepts JPEG and PNG only.
    const acceptedImageTypes: AcceptedImageTypes[] = ["image/jpeg", "image/png"];

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

  const prepareFile = async (file: File): Promise<void> => {
    if (!handleFileValidation(file)) {
      return;
    }
    const version = ++selectionVersionRef.current;
    previewReaderRef.current?.abort();
    resetMessages();
    setIsPreparing(true);
    onPreparingChange?.(true);
    setIsOptimizing(file.size > MAX_TOTAL_UPLOAD_BYTES);
    try {
      let workingFile = file;
      if (file.size > MAX_TOTAL_UPLOAD_BYTES) {
        const optimized = await compressImageIfNeeded(file, {
          maxBytes: MAX_TOTAL_UPLOAD_BYTES,
        });
        if (optimized) workingFile = optimized;
      }
      if (version !== selectionVersionRef.current) return;
      if (workingFile.size > MAX_TOTAL_UPLOAD_BYTES) {
        setError(t("tooLarge", { limit: MAX_UPLOAD_LIMIT_LABEL }));
        return;
      }
      updateImage(workingFile, version);
      onUpload(workingFile);
    } catch (compressionError) {
      console.error("Image preparation failed", compressionError);
      if (version === selectionVersionRef.current) setError(t("compressFailed"));
    } finally {
      if (version === selectionVersionRef.current) {
        setIsPreparing(false);
        setIsOptimizing(false);
        onPreparingChange?.(false);
      }
    }
  };

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

  const updateImage = (file: File, version: number): void => {
    const reader = new FileReader();
    previewReaderRef.current = reader;
    reader.addEventListener("load", () => {
      if (version === selectionVersionRef.current && typeof reader.result === "string") {
        setImgData(reader.result);
      }
    });
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    selectionVersionRef.current += 1;
    previewReaderRef.current?.abort();
    setIsPreparing(false);
    setIsOptimizing(false);
    onPreparingChange?.(false);
    setImgData(null);
    resetMessages();
    if (fileSelect.current) {
      fileSelect.current.value = "";
    }
    onUpload(null);
  };

  const isInteractionDisabled = isPreparing;

  return (
    <div className="w-full text-foreground-strong">
      <label htmlFor="image" className="form-label">
        {t("label")}
      </label>

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
          <UploadIcon className="w-10 h-10 text-muted-foreground" />
          <p className="body-normal text-muted-foreground">
            {t("uploadDropCta")}
          </p>
          <p className="body-small text-muted-foreground">
            {t("uploadDropHelper")}
          </p>
          {/* Clear CTA Button */}
          <span className="inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-wide rounded-button px-6 py-3 bg-primary text-primary-foreground min-h-[44px]">
            {t("selectButton")}
          </span>
          <p className="body-small text-muted-foreground mt-1">
            {t("formatHelper")}
          </p>

          <input
            ref={fileSelect}
            type="file"
            accept="image/png, image/jpeg"
            style={{ display: "none" }}
            onChange={(event) => {
              void onChangeImage(event);
            }}
            disabled={isInteractionDisabled}
          />
        </div>
      </div>
      {isOptimizing && (
        <p className="text-sm text-muted-foreground mt-2">
          {t("optimizing", { limit: MAX_UPLOAD_LIMIT_LABEL })}
        </p>
      )}
      {status && (
        <p className="text-sm text-foreground/80 mt-2" data-testid="image-upload-status">
          {status}
        </p>
      )}
      {error && (
        <div
          className="mt-3 px-4 py-3 bg-error/10 border border-error rounded-lg flex items-start gap-3"
          role="alert"
        >
          <svg
            className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium text-error">{error}</p>
        </div>
      )}
      {imgData && (imgData.startsWith("http") || imgData.startsWith("data:") || imgData.startsWith("/")) ? (
        <div className="flex justify-center items-start p-4">
          <button
            onClick={handleRemoveImage}
            aria-label={t("remove")}
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
          <img
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
