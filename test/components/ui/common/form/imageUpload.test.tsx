/* eslint-disable @next/next/no-img-element */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageUploader from "@components/ui/common/form/imageUpload";
import { renderWithProviders } from "../../../../utils/renderWithProviders";
import {
  MAX_TOTAL_UPLOAD_BYTES,
  formatMegabytesLabel,
} from "@utils/constants";

const mockCompress = vi.fn();

vi.mock("@utils/image-optimizer", () => ({
  compressImageIfNeeded: (...args: unknown[]) => mockCompress(...args),
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
  result: string | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    // Simulate async behavior
    setTimeout(() => {
      this.result = "data:image/jpeg;base64,test";
      if (this.onload) {
        // Call with proper context - cast to avoid TypeScript error
        const event = {} as ProgressEvent<FileReader>;
        (this.onload as any).call(this, event);
      }
    }, 0);
  }

  addEventListener(
    event: string,
    callback: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ) {
    if (event === "load" && typeof callback === "function") {
      this.onload = callback as (this: FileReader, ev: ProgressEvent<FileReader>) => void;
    }
  }

  removeEventListener() { }
}

global.FileReader = MockFileReader as unknown as typeof FileReader;

const MAX_LIMIT_LABEL = formatMegabytesLabel(MAX_TOTAL_UPLOAD_BYTES);

describe("ImageUploader file validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompress.mockReset();
    mockCompress.mockResolvedValue(null);
  });

  const createMockFile = (
    name: string,
    type: string,
    size: number
  ): File => {
    const file = new File([], name, { type });
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });
    return file;
  };

  it(`accepts valid image files under ${MAX_LIMIT_LABEL}MB`, async () => {
    const onUpload = vi.fn();
    const validFile = createMockFile(
      "test.jpg",
      "image/jpeg",
      1.5 * 1024 * 1024
    ); // 1.5MB

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Create a FileList-like object
    Object.defineProperty(input, "files", {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(validFile);
    }, { timeout: 2000 });

    // Should not show error message
    expect(
      screen.queryByText(
        new RegExp(`supera el límit permès de ${MAX_LIMIT_LABEL} MB`, "i")
      )
    ).not.toBeInTheDocument();
  });

  it(`rejects files over ${MAX_LIMIT_LABEL}MB with correct error message`, async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      3 * 1024 * 1024
    ); // 3MB

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(
            `La mida de la imatge supera el límit permès de ${MAX_LIMIT_LABEL} MB`,
            "i"
          )
        )
      ).toBeInTheDocument();
    });

    // onUpload should not be called for invalid files
    expect(onUpload).not.toHaveBeenCalled();
  });

  it(`accepts files exactly at ${MAX_LIMIT_LABEL}MB boundary`, async () => {
    const onUpload = vi.fn();
    // Exactly at the configured limit (should pass as validation uses > not >=)
    const boundaryFile = createMockFile(
      "boundary.jpg",
      "image/jpeg",
      2 * 1024 * 1024
    );

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [boundaryFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(boundaryFile);
    }, { timeout: 2000 });

    // Should not show error message
    expect(
      screen.queryByText(
        new RegExp(`supera el límit permès de ${MAX_LIMIT_LABEL} MB`, "i")
      )
    ).not.toBeInTheDocument();
  });

  it(`accepts files just under ${MAX_LIMIT_LABEL}MB`, async () => {
    const onUpload = vi.fn();
    // 1.9MB (should pass)
    const validFile = createMockFile(
      "valid.jpg",
      "image/jpeg",
      1.9 * 1024 * 1024
    );

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(validFile);
    }, { timeout: 2000 });

    expect(
      screen.queryByText(
        new RegExp(`supera el límit permès de ${MAX_LIMIT_LABEL} MB`, "i")
      )
    ).not.toBeInTheDocument();
  });

  it("compresses files over the limit when optimizer succeeds", async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      9 * 1024 * 1024
    );
    const compressedFile = createMockFile(
      "large-compressed.jpg",
      "image/jpeg",
      1.5 * 1024 * 1024
    );
    mockCompress.mockResolvedValueOnce(compressedFile);

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(compressedFile);
    });

    expect(
      screen.queryByTestId("image-upload-status")
    ).not.toBeInTheDocument();
  });

  it("shows a descriptive error if compression throws", async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      9 * 1024 * 1024
    );
    mockCompress.mockRejectedValueOnce(new Error("failed"));

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText(/No hem pogut reduir la imatge/i)
      ).toBeInTheDocument();
    });

    expect(onUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    const onUpload = vi.fn();
    const invalidFile = createMockFile("test.pdf", "application/pdf", 1024);

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} progress={0} />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText(/no és una imatge suportada/i)
      ).toBeInTheDocument();
    });

    expect(onUpload).not.toHaveBeenCalled();
  });
});

