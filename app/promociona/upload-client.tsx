"use client";

import { useState } from "react";
import ImageUploader from "@components/ui/common/form/imageUpload";

export default function ClientBusinessUpload() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm text-blackCorp/70">
        Carrega una imatge o banner (JPG, PNG, WEBP fins a 5MB). Només previsualització al MVP.
      </p>
      <div className="max-w-md">
        <ImageUploader
          value={null}
          onUpload={(f) => setFile(f)}
          progress={0}
        />
      </div>
      {file && (
        <p className="text-xs text-blackCorp/60">Fitxer seleccionat: {file.name}</p>
      )}
    </div>
  );
}