/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ImageUploaderProps } from "types/props";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_LIMIT_LABEL,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_ORIGINAL_LIMIT_LABEL,
} from "@utils/constants";
import { isBackendImageType } from "@utils/image-validation";
import { compressImageIfNeeded } from "@utils/image-optimizer";

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
  const onPreparingChangeRef = useRef(onPreparingChange);
  useEffect(() => {
    onPreparingChangeRef.current = onPreparingChange;
  });

  useEffect(() => () => {
    selectionVersionRef.current += 1;
    onPreparingChangeRef.current?.(false);
  }, []);

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
    if (!isBackendImageType(file.type)) {
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

  const handleRemoveImage = () => {
    selectionVersionRef.current += 1;
    setIsPreparing(false);
    setIsOptimizing(false);
    onPreparingChange?.(false);
    resetMessages();
    if (fileSelect.current) {
      fileSelect.current.value = "";
    }
    onUpload(null);
  };

  const isInteractionDisabled = isPreparing;
  const hasPreview = Boolean(
    value && (value.startsWith("http") || value.startsWith("data:") || value.startsWith("/"))
  );

  return (
    <div className="w-full">
      <span id="image-label" className="form-label block">
        {t("label")}
      </span>
      <input
        ref={fileSelect}
        id="image"
        type="file"
        accept="image/png, image/jpeg"
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
              type="button"
              className="btn-neutral bg-background shadow-sm py-1.5"
              onClick={() => void handleImageUpload()}
              disabled={isInteractionDisabled}
            >
              {t("change")}
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label={t("remove")}
              className="flex-center h-10 w-10 rounded-full bg-background text-foreground shadow-sm hover:bg-muted focus-ring"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div
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
          aria-labelledby="image-label"
          aria-describedby="image-format"
        >
          <div className="flex-center flex-col gap-2 p-6 text-center">
            <PhotoIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <span className="btn-neutral">{t("selectButton")}</span>
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
