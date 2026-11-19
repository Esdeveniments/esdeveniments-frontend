/* eslint-disable @next/next/no-img-element */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageUploader from "@components/ui/common/form/imageUpload";
import { useImagePreview } from "@components/hooks/useImagePreview";
import { renderWithProviders } from "../../../../utils/renderWithProviders";
import {
  MAX_ORIGINAL_FILE_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  POSTER_IMAGE_ACCEPT,
  formatMegabytesLabel,
} from "@utils/constants";
import type { PosterImageResult } from "types/upload";

const mockPrepare = vi.fn();
const mockSendEvent = vi.fn();

vi.mock("@utils/image-optimizer", () => ({
  preparePosterImage: (...args: unknown[]) => mockPrepare(...args),
}));
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendEvent(...args),
}));

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock FileReader
class MockFileReader {
  static instances: MockFileReader[] = [];
  static automatic = true;
  result: string | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null =
    null;

  readAsDataURL() {
    MockFileReader.instances.push(this);
    if (!MockFileReader.automatic) return;
    // Simulate async behavior
    setTimeout(() => {
      this.result = "data:image/jpeg;base64,test";
      if (this.onload) {
        // Call with proper context - cast to avoid TypeScript error
        const event = {} as ProgressEvent<FileReader>;
        Reflect.apply(this.onload, this, [event]);
      }
    }, 0);
  }

  addEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions,
  ) {
    if (event === "load" && typeof callback === "function") {
      this.onload = callback as (
        this: FileReader,
        ev: ProgressEvent<FileReader>,
      ) => void;
    }
  }

  removeEventListener() {}
  abort = vi.fn();

  complete() {
    this.result = "data:image/jpeg;base64,late";
    if (this.onload) Reflect.apply(this.onload, this, [new ProgressEvent("load")]);
  }
}

const MAX_LIMIT_LABEL = formatMegabytesLabel(MAX_TOTAL_UPLOAD_BYTES);

/** Wires the uploader the way the publish and edit forms do. */
function WithPreview({
  initial,
  onUpload,
  onPreparingChange,
}: {
  initial: string | null;
  onUpload: (file: File | null) => void;
  onPreparingChange?: (preparing: boolean) => void;
}) {
  const [preview, updatePreview] = useImagePreview(initial);
  return (
    <ImageUploader
      value={preview}
      onUpload={(file) => {
        onUpload(file);
        updatePreview(file);
      }}
      onPreparingChange={onPreparingChange}
    />
  );
}

describe("ImageUploader file validation", () => {
  beforeEach(() => {
    vi.stubGlobal("FileReader", MockFileReader);
    MockFileReader.instances = [];
    MockFileReader.automatic = true;
    vi.clearAllMocks();
    mockPrepare.mockReset();
    mockPrepare.mockImplementation(async (file: File) => ({
      ok: true,
      file,
      detectedType: file.type,
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const createMockFile = (name: string, type: string, size: number): File => {
    const file = new File([], name, { type });
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });
    return file;
  };

  const ready = (file: File): PosterImageResult => ({ ok: true, file, detectedType: "image/jpeg" });

  const pick = (file: File) =>
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

  it("ignores compression finishing after the editor is unmounted", async () => {
    const pending = Promise.withResolvers<PosterImageResult>();
    mockPrepare.mockReturnValueOnce(pending.promise);
    const onUpload = vi.fn();
    const view = renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [createMockFile("large.jpg", "image/jpeg", 9 * 1024 * 1024)] },
    });
    view.unmount();
    await act(async () => pending.resolve(ready(createMockFile("small.jpg", "image/jpeg", 100))));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("invalidates pending compression when the user removes the cover", async () => {
    const pending = Promise.withResolvers<PosterImageResult>();
    mockPrepare.mockReturnValueOnce(pending.promise);
    const onUpload = vi.fn();
    const preparing = vi.fn();
    renderWithProviders(
      <WithPreview initial="https://example.com/old.jpg" onUpload={onUpload} onPreparingChange={preparing} />,
    );
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [createMockFile("large.jpg", "image/jpeg", 9 * 1024 * 1024)] },
    });
    expect(preparing).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Elimina la imatge" }));
    await act(async () => pending.resolve(ready(createMockFile("small.jpg", "image/jpeg", 100))));
    expect(onUpload.mock.calls).toEqual([[null]]);
    expect(preparing).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("ignores a preview load arriving after removal", async () => {
    MockFileReader.automatic = false;
    const onUpload = vi.fn();
    renderWithProviders(<WithPreview initial="https://example.com/old.jpg" onUpload={onUpload} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [createMockFile("new.jpg", "image/jpeg", 100)] },
    });
    await waitFor(() => expect(MockFileReader.instances).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Elimina la imatge" }));
    act(() => MockFileReader.instances[0].complete());
    expect(onUpload).toHaveBeenLastCalledWith(null);
    expect(MockFileReader.instances[0].abort).toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the preview its parent passes, not one of its own", async () => {
    const onUpload = vi.fn();
    const { rerender } = renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );
    const file = createMockFile("new.jpg", "image/jpeg", 100);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(file));
    await act(async () => {});
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(<ImageUploader value="data:image/jpeg;base64,parent" onUpload={onUpload} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "data:image/jpeg;base64,parent");
  });

  it("doesn't count a JPEG that only got its type fixed as converted", async () => {
    const onUpload = vi.fn();
    const picked = createMockFile("IMG_1234", "", 1024 * 1024);
    const typed = createMockFile("IMG_1234.jpg", "image/jpeg", 1024 * 1024);
    mockPrepare.mockResolvedValueOnce(ready(typed));
    renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);

    pick(picked);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(typed));
    expect(mockSendEvent).toHaveBeenCalledWith("poster_image_prepared", {
      detected_type: "image/jpeg",
      converted: false,
      size_mb: 1,
    });
  });

  it("opens the picker for any image, HEIC included", () => {
    renderWithProviders(<ImageUploader value={null} onUpload={vi.fn()} />);
    expect(document.querySelector('input[type="file"]')).toHaveAttribute("accept", POSTER_IMAGE_ACCEPT);
  });

  it("passes the prepared file on, even when the picker sent no type", async () => {
    const onUpload = vi.fn();
    const picked = createMockFile("IMG_1234", "", 9 * 1024 * 1024);
    const prepared = createMockFile("IMG_1234.jpg", "image/jpeg", 1.5 * 1024 * 1024);
    mockPrepare.mockResolvedValueOnce(ready(prepared));
    renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);

    pick(picked);

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(prepared));
    expect(mockPrepare).toHaveBeenCalledWith(picked, { maxBytes: MAX_TOTAL_UPLOAD_BYTES });
    expect(mockSendEvent).toHaveBeenCalledWith("poster_image_prepared", {
      detected_type: "image/jpeg",
      converted: true,
      size_mb: 9,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["too_large", `No hem pogut reduir la imatge per sota de ${MAX_LIMIT_LABEL} MB`],
    ["heic_undecodable", "Aquest navegador no pot obrir fotos HEIC"],
    ["undecodable", "No hem pogut llegir aquesta imatge"],
    ["empty", "No hem pogut llegir aquesta imatge"],
    ["encode_failed", "No hem pogut reduir la imatge. Torna-ho a provar."],
  ] as const)("explains a %s failure and reports it", async (reason, message) => {
    const onUpload = vi.fn();
    mockPrepare.mockResolvedValueOnce({ ok: false, reason, detectedType: "image/heic" });
    renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);

    pick(createMockFile("photo.heic", "", 3 * 1024 * 1024));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onUpload).not.toHaveBeenCalled();
    expect(mockSendEvent).toHaveBeenCalledWith("poster_image_blocked", {
      reason,
      detected_type: "image/heic",
      file_type: "blank",
      size_mb: 3,
    });
  });

  it("refuses a file over the original limit without decoding it", async () => {
    const onUpload = vi.fn();
    renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);

    pick(createMockFile("huge.jpg", "image/jpeg", MAX_ORIGINAL_FILE_BYTES + 1));

    expect(await screen.findByRole("alert")).toHaveTextContent(/supera el límit/);
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(mockSendEvent).toHaveBeenCalledWith("poster_image_blocked", {
      reason: "original_too_large",
      size_mb: 25,
    });
  });

  it("shows a descriptive error if preparation throws", async () => {
    const onUpload = vi.fn();
    mockPrepare.mockRejectedValueOnce(new Error("failed"));
    renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);

    pick(createMockFile("large.jpg", "image/jpeg", 9 * 1024 * 1024));

    expect(await screen.findByRole("alert")).toHaveTextContent(/No hem pogut reduir la imatge/i);
    expect(onUpload).not.toHaveBeenCalled();
  });
});
