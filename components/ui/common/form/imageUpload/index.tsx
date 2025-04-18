import Image from "next/image";
import { useRef, useState } from "react";
import UploadIcon from "@heroicons/react/outline/UploadIcon";

type AcceptedImageTypes =
  | "image/jpeg"
  | "image/png"
  | "image/jpg"
  | "image/webp";

interface ImageUploaderProps {
  value: string | null;
  onUpload: (file: File) => void;
  progress: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onUpload,
  progress,
}) => {
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
      setError(
        "El fitxer seleccionat no és una imatge suportada. Si us plau, carregueu un fitxer en format JPEG, PNG, JPG, o WEBP."
      );
      return false;
    }
    if (file.size > 5000000) {
      setError(
        "La mida de l'imatge supera el límit permès de 5 MB. Si us plau, trieu una imatge més petita."
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
    <div className="w-full text-blackCorp">
      <label htmlFor="image" className="text-blackCorp font-bold">
        Imatge *
      </label>

      <div
        className={`mt-2 border ${
          dragOver ? "border-primary" : "border-bColor"
        } rounded-xl cursor-pointer`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <form className="flex justify-center items-center h-full">
          {progress === 0 ? (
            <div className="text-center">
              <button
                className="bg-whiteCorp hover:bg-primary font-bold px-2 py-2 rounded-xl"
                onClick={handleImageUpload}
                type="button"
              >
                <UploadIcon className="w-6 h-6 text-blackCorp hover:text-whiteCorp" />
              </button>
            </div>
          ) : (
            <span className="text-blackCorp">{progress}%</span>
          )}

          <input
            ref={fileSelect}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            style={{ display: "none" }}
            onChange={onChangeImage}
          />
        </form>
        {error && <p className="text-primary text-sm mt-2">{error}</p>}
      </div>
      {imgData && (
        <div className="flex justify-center items-start p-4">
          <button
            onClick={() => setImgData(null)}
            className="bg-whiteCorp rounded-full p-1 hover:bg-primary"
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
