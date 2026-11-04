import { useCallback, useEffect, useRef, useState } from "react";

export function useImagePreview(initialValue: string | null) {
  const [preview, setPreview] = useState(initialValue);
  const versionRef = useRef(0);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(() => () => {
    versionRef.current += 1;
    readerRef.current?.abort();
  }, []);

  const updatePreview = useCallback((file: File | null) => {
    const version = ++versionRef.current;
    readerRef.current?.abort();
    if (!file) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    reader.addEventListener("load", () => {
      if (version === versionRef.current && typeof reader.result === "string") {
        setPreview(reader.result);
      }
    });
    reader.addEventListener("error", () => {
      if (version === versionRef.current) setPreview(null);
    });
    reader.readAsDataURL(file);
  }, []);

  return [preview, updatePreview] as const;
}
