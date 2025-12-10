import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";
import type { UploadImageOptions, UploadImageResponse } from "types/upload";

const UPLOAD_ENDPOINT = "/api/publica/image-upload";

export function uploadImageWithProgress(
  file: File,
  options: UploadImageOptions = {}
): Promise<UploadImageResponse> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new Error("No s'ha trobat cap fitxer per pujar."));
      return;
    }

    const { onProgress, signal } = options;
    let attempt = 0;
    const maxAttempts = 2;
    let aborted = false;
    let xhr: XMLHttpRequest | null = null;
    let abortHandler: (() => void) | null = null;

    const cleanup = () => {
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
      abortHandler = null;
      xhr = null;
    };

    const rejectAbort = () => {
      aborted = true;
      cleanup();
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    const start = () => {
      if (aborted) return;
      if (signal?.aborted) {
        rejectAbort();
        return;
      }

      xhr = new XMLHttpRequest();
      xhr.open("POST", UPLOAD_ENDPOINT);
      xhr.responseType = "text";

      abortHandler = () => {
        if (xhr) {
          xhr.abort();
        }
        rejectAbort();
      };
      if (signal) {
        signal.addEventListener("abort", abortHandler, { once: true });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && typeof onProgress === "function") {
          const percent = Math.min(
            100,
            Math.round((event.loaded / event.total) * 100)
          );
          onProgress(percent);
        }
      };

      const handleParsedResponse = (responseText: string) => {
        try {
          const parsed = responseText ? JSON.parse(responseText) : null;
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.url === "string" &&
            typeof parsed.publicId === "string"
          ) {
            cleanup();
            resolve({
              url: parsed.url,
              publicId: parsed.publicId,
            });
            return;
          }
        } catch {
          // fall through
        }
        cleanup();
        reject(
          new Error(
            "No s'ha rebut una resposta vàlida (url + publicId) de la imatge."
          )
        );
      };

      const maybeRetry = (message: string) => {
        if (aborted) return;
        if (attempt + 1 < maxAttempts) {
          attempt += 1;
          setTimeout(start, 200); // small backoff
          return;
        }
        cleanup();
        reject(new Error(message));
      };

      xhr.onload = () => {
        const responseText =
          typeof xhr?.response === "string" ? xhr.response : "";
        if (xhr!.status >= 200 && xhr!.status < 300) {
          handleParsedResponse(responseText);
          return;
        }

        if (xhr!.status === 413) {
          cleanup();
          reject(new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR));
          return;
        }

        if (xhr!.status >= 500 && xhr!.status < 600) {
          maybeRetry(
            "No s'ha pogut pujar la imatge. Torna-ho a intentar més tard."
          );
          return;
        }

        const errorMessage =
          responseText ||
          "No s'ha pogut pujar la imatge. Torna-ho a intentar més tard.";
        cleanup();
        reject(new Error(errorMessage));
      };

      xhr.onerror = () => {
        maybeRetry("No s'ha pogut connectar amb el servidor de pujades.");
      };

      xhr.ontimeout = () => {
        maybeRetry("La connexió ha expirat en pujar la imatge.");
      };

      const formData = new FormData();
      formData.append("imageFile", file, file.name || "event-image");

      xhr.send(formData);
    };

    start();
  });
}
