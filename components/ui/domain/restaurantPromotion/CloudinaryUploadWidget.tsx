"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  CloudinarySignatureResponse,
  CloudinaryUploadWidgetProps,
} from "types/api/restaurant";
import { Text } from "@components/ui/primitives/Text";

export function CloudinaryUploadWidget({
  onUpload,
  image,
}: CloudinaryUploadWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Get signed upload parameters from our API
      const signatureResponse = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_id: `restaurant_${Date.now()}`,
          folder: "restaurant-promotions",
        }),
      });

      if (!signatureResponse.ok) {
        throw new Error("Failed to get upload signature");
      }

      const signatureData: CloudinarySignatureResponse =
        await signatureResponse.json();

      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signatureData.signature);
      formData.append("timestamp", signatureData.timestamp.toString());
      formData.append("cloud_name", signatureData.cloud_name);
      formData.append("api_key", signatureData.api_key);
      formData.append("folder", "restaurant-promotions");
      formData.append("transformation", "w_800,h_600,c_fill,q_auto,f_auto");

      // Upload to Cloudinary
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadResponse.json();

      // Call the onUpload callback with the image data
      onUpload({
        public_id: uploadData.public_id,
        secure_url: uploadData.secure_url,
      });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onUpload(null as unknown as { public_id: string; secure_url: string });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          id="restaurant-image-upload"
        />
        <label
          htmlFor="restaurant-image-upload"
          className={`block w-full cursor-pointer rounded-md border-2 border-dashed border-bColor px-component-md py-component-sm text-center transition-colors hover:border-primary ${
            isUploading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
              <Text variant="body-sm">Uploading...</Text>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-8 w-8 text-blackCorp/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <Text
                variant="body-sm"
                className="mt-component-xs text-blackCorp/80"
              >
                Click to upload restaurant image
              </Text>
              <Text variant="caption" size="xs" color="muted">
                PNG, JPG up to 5MB
              </Text>
            </div>
          )}
        </label>
      </div>

      {/* Image Preview */}
      {image && (
        <div className="relative">
          <Image
            src={image.secure_url}
            alt="Restaurant preview"
            width={400}
            height={192}
            className="h-48 w-full rounded-md object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="text-white hover:bg-red-600 absolute right-2 top-2 rounded-full bg-error/100 p-component-xs transition-colors"
          >
            <svg
              className="h-4 w-4"
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
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <Text variant="body-sm" className="text-error">
          {uploadError}
        </Text>
      )}
    </div>
  );
}
