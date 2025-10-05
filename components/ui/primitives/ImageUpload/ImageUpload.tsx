"use client";

import Image from "next/image";
import { useRef, useState, memo } from "react";
import UploadIcon from "@heroicons/react/outline/UploadIcon";
import { AcceptedImageTypes } from "types/props";
import { ImageUploadProps } from "types/ui/primitives";
import { cn } from "@components/utils/cn";
import { Text } from "@components/ui/primitives/Text";

/**
 * ImageUpload primitive component for file upload with drag & drop.
 * Supports image validation, progress indication, and preview functionality.
 *
 * @param value - Current image value (base64 string or null)
 * @param onUpload - Callback when a valid image is selected/uploaded
 * @param progress - Upload progress percentage (0-100)
 * @param className - Additional CSS classes
 * @param accept - Accepted file types (default: image/png, image/jpeg, image/jpg)
 * @param maxSize - Maximum file size in bytes (default: 5MB)
 * @param disabled - Whether the component is disabled
 */
export const ImageUpload = memo<ImageUploadProps>(
  ({
    value,
    onUpload,
    progress = 0,
    className,
    accept = "image/png, image/jpeg, image/jpg",
    maxSize = 5000000, // 5MB
    disabled = false,
  }) => {
    const fileSelect = useRef<HTMLInputElement>(null);
    const [imgData, setImgData] = useState<string | null>(value || null);
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    async function handleImageUpload(): Promise<void> {
      if (fileSelect.current && !disabled) {
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
        setError(
          "El fitxer seleccionat no és una imatge suportada. Si us plau, carregueu un fitxer en format JPEG, PNG, JPG, o WEBP.",
        );
        return false;
      }
      if (file.size > maxSize) {
        setError(
          `La mida de l'imatge supera el límit permès de ${maxSize / 1000000} MB. Si us plau, trieu una imatge més petita.`,
        );
        return false;
      }

      setError("");
      return true;
    }

    const onChangeImage = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file && handleFileValidation(file)) {
        updateImage(file);
        onUpload(file);
      }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file && handleFileValidation(file)) {
        updateImage(file);
        onUpload(file);
      }
    };

    const updateImage = (file: File): void => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgData(reader.result as string);
      });
      reader.readAsDataURL(file);
    };

    const clearImage = (): void => {
      setImgData(null);
      setError("");
      if (fileSelect.current) {
        fileSelect.current.value = "";
      }
    };

    return (
      <div className={cn("w-full text-blackCorp", className)}>
        <div
          className={cn(
            "mt-component-xs cursor-pointer rounded-xl border transition-colors",
            dragOver && !disabled ? "border-primary" : "border-bColor",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleImageUpload}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) {
              e.preventDefault();
              handleImageUpload();
            }
          }}
          aria-label="Upload image"
          aria-describedby={error ? "image-upload-error" : undefined}
        >
          <div className="flex h-full items-center justify-center p-component-md">
            {progress > 0 && progress < 100 ? (
              <Text variant="body" color="black" className="font-medium">
                {progress}%
              </Text>
            ) : (
              <div className="text-center">
                <button
                  className="rounded-xl bg-whiteCorp px-component-xs py-component-xs font-bold transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:hover:bg-whiteCorp"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageUpload();
                  }}
                  disabled={disabled}
                  type="button"
                  aria-label="Select image file"
                >
                  <UploadIcon className="h-6 w-6 text-blackCorp hover:text-whiteCorp disabled:text-blackCorp" />
                </button>
              </div>
            )}

            <input
              ref={fileSelect}
              type="file"
              accept={accept}
              style={{ display: "none" }}
              onChange={onChangeImage}
              disabled={disabled}
              aria-describedby={error ? "image-upload-error" : undefined}
              aria-invalid={!!error}
            />
          </div>

          {error && (
            <Text
              as="p"
              variant="body-sm"
              color="primary"
              className="mt-component-xs px-component-md pb-component-md"
              id="image-upload-error"
              role="alert"
            >
              {error}
            </Text>
          )}
        </div>

        {imgData && (
          <div className="flex items-start justify-center gap-component-xs p-component-md">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="rounded-full bg-whiteCorp p-component-xs transition-colors hover:bg-primary"
              type="button"
              aria-label="Remove image"
              disabled={disabled}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blackCorp hover:text-whiteCorp"
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
              alt="Uploaded image preview"
              height={100}
              width={100}
              className="rounded object-contain"
              src={imgData}
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </div>
        )}
      </div>
    );
  },
);

ImageUpload.displayName = "ImageUpload";
