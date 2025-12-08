import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

type UploadOptions = {
  onProgress?: (percent: number) => void;
};

const UPLOAD_ENDPOINT = "/api/publica/image-upload";

export function uploadImageWithProgress(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("No s'ha trobat cap fitxer per pujar."));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", UPLOAD_ENDPOINT);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof options.onProgress === "function") {
        const percent = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100)
        );
        options.onProgress(percent);
      }
    };

    xhr.onload = () => {
      const responseText = typeof xhr.response === "string" ? xhr.response : "";
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = responseText ? JSON.parse(responseText) : null;
          if (parsed && typeof parsed.url === "string") {
            resolve(parsed.url);
            return;
          }
        } catch {
          // Not JSON, fall back to raw value
        }

        const trimmed = responseText.trim().replace(/^"|"$/g, "");
        if (trimmed) {
          resolve(trimmed);
        } else {
          reject(new Error("No s'ha rebut la URL de la imatge."));
        }
        return;
      }

      if (xhr.status === 413) {
        reject(new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR));
        return;
      }

      const errorMessage =
        responseText ||
        "No s'ha pogut pujar la imatge. Torna-ho a intentar més tard.";
      reject(new Error(errorMessage));
    };

    xhr.onerror = () => {
      reject(new Error("No s'ha pogut connectar amb el servidor de pujades."));
    };

    const formData = new FormData();
    formData.append("imageFile", file, file.name || "event-image");

    xhr.send(formData);
  });
}
