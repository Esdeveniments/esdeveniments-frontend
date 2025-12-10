export type UploadImageOptions = {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export type UploadImageResponse = {
  url: string;
  publicId: string;
};
