import Image from "next/image";
import { useRef, useState } from "react";
import UploadIcon from "@heroicons/react/outline/UploadIcon";
import { AcceptedImageTypes, ImageUploaderProps } from "types/props";
import { MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { compressImageIfNeeded } from "@utils/image-optimizer";

const MAX_ORIGINAL_FILE_BYTES = 25 * 1024 * 1024; // 25 MB guardrail

const formatMegabytesLabel = (bytes: number): string => {
  const value = bytes / (1024 * 1024);
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const formatMegabytes = (bytes: number): string =>
  (bytes / (1024 * 1024)).toFixed(2);

const MAX_UPLOAD_LIMIT_LABEL = formatMegabytesLabel(MAX_TOTAL_UPLOAD_BYTES);
const MAX_ORIGINAL_LIMIT_LABEL = formatMegabytesLabel(MAX_ORIGINAL_FILE_BYTES);

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onUpload,
  progress,
}) => {
  const fileSelect = useRef<HTMLInputElement>(null);
  const [imgData, setImgData] = useState<string | null>(value);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

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
    const acceptedImageTypes: AcceptedImageTypes[] = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    if (!acceptedImageTypes.includes(file.type as AcceptedImageTypes)) {
      setError(
        "El fitxer seleccionat no és una imatge suportada. Si us plau, carregueu un fitxer en format JPEG, PNG, JPG o WEBP."
      );
      return false;
    }

    if (file.size > MAX_ORIGINAL_FILE_BYTES) {
      setError(
        `La imatge supera el límit màxim de ${MAX_ORIGINAL_LIMIT_LABEL} MB. Si us plau, redueix-la abans de pujar-la.`
      );
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
          setStatus(
            `Hem reduït la imatge de ${formatMegabytes(
              file.size
            )} MB a ${formatMegabytes(
              optimized.size
            )} MB per complir el límit.`
          );
          workingFile = optimized;
        }
      } catch (compressionError) {
        console.error("Image optimization failed", compressionError);
        setError(
          "No hem pogut reduir la imatge per complir el límit. Si us plau, tria una imatge més petita."
        );
        return null;
      } finally {
        setIsOptimizing(false);
      }
    }

    if (workingFile.size > MAX_TOTAL_UPLOAD_BYTES) {
      setError(
        `La mida de la imatge supera el límit permès de ${MAX_UPLOAD_LIMIT_LABEL} MB. Si us plau, tria una imatge més petita.`
      );
      return null;
    }

    return workingFile;
  };

  const onChangeImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
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

  return (
    <div className="w-full text-foreground-strong">
      <label htmlFor="image" className="text-foreground-strong font-bold">
        Imatge *
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
        onDrop={(event) => {
          void handleDrop(event);
        }}
      >
        <div className="flex justify-center items-center h-full">
          {progress === 0 ? (
            <div className="text-center">
              <button
                className="bg-background hover:bg-primary font-bold px-2 py-2 rounded-xl"
                onClick={handleImageUpload}
                type="button"
                disabled={isOptimizing}
              >
                <UploadIcon className="w-6 h-6 text-foreground-strong hover:text-background" />
              </button>
            </div>
          ) : (
            <span className="text-foreground-strong">{progress}%</span>
          )}

          <input
            ref={fileSelect}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              void onChangeImage(event);
            }}
            disabled={isOptimizing}
          />
        </div>
      </div>
      {isOptimizing && (
        <p className="text-sm text-foreground/70 mt-2">
          Optimitzant la imatge per complir el límit de {MAX_UPLOAD_LIMIT_LABEL} MB...
        </p>
      )}
      {status && (
        <p className="text-sm text-foreground/80 mt-2" data-testid="image-upload-status">
          {status}
        </p>
      )}
      {error && <p className="text-primary text-sm mt-2">{error}</p>}
      {imgData && (
        <div className="flex justify-center items-start p-4">
          <button
            onClick={() => setImgData(null)}
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
            alt="Imatge"
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
