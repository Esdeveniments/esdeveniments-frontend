import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import UploadIcon from "@heroicons/react/outline/UploadIcon";
import { AcceptedImageTypes, ImageUploaderProps } from "types/props";

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onUpload,
  progress,
}) => {
  const t = useTranslations("Components.ImageUploader");
  const fileSelect = useRef<HTMLInputElement>(null);
  const [imgData, setImgData] = useState<string | null>(value);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

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
    // Client-side limit: 8MB (leaves buffer for form data in total 10MB server limit)
    if (file.size > 8 * 1024 * 1024) {
      setError(t("tooLarge"));
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

  return (
    <div className="w-full text-foreground-strong">
      <label htmlFor="image" className="text-foreground-strong font-bold">
        {t("label")}
      </label>

      <div
        className={`mt-2 border ${
          dragOver ? "border-primary" : "border-border"
        } rounded-xl cursor-pointer`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex justify-center items-center h-full">
          {progress === 0 ? (
            <div className="text-center">
              <button
                className="bg-background hover:bg-primary font-bold px-2 py-2 rounded-xl"
                onClick={handleImageUpload}
                type="button"
              >
                <UploadIcon className="w-6 h-6 text-foreground-strong hover:text-background" />
              </button>
            </div>
          ) : (
            <span className="text-foreground-strong">{t("progress", { progress })}</span>
          )}

          <input
            ref={fileSelect}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            style={{ display: "none" }}
            onChange={onChangeImage}
          />
        </div>
        {error && <p className="text-primary text-sm mt-2">{error}</p>}
      </div>
      {imgData && (
        <div className="flex justify-center items-start p-4">
          <button
            onClick={() => setImgData(null)}
            className="bg-background rounded-full p-1 hover:bg-primary"
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
      )}
    </div>
  );
};

ImageUploader.displayName = "ImageUploader";

export default ImageUploader;
