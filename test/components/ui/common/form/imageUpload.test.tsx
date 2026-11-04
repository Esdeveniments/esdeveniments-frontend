/* eslint-disable @next/next/no-img-element */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ImageUploader from "@components/ui/common/form/imageUpload";
import { useImagePreview } from "@components/hooks/useImagePreview";
import { renderWithProviders } from "../../../../utils/renderWithProviders";
import { MAX_TOTAL_UPLOAD_BYTES, formatMegabytesLabel } from "@utils/constants";

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
    mockCompress.mockReset();
    mockCompress.mockResolvedValue(null);
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

  it("ignores compression finishing after the editor is unmounted", async () => {
    const pending = Promise.withResolvers<File>();
    mockCompress.mockReturnValueOnce(pending.promise);
    const onUpload = vi.fn();
    const view = renderWithProviders(<ImageUploader value={null} onUpload={onUpload} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [createMockFile("large.jpg", "image/jpeg", 9 * 1024 * 1024)] },
    });
    view.unmount();
    await act(async () => pending.resolve(createMockFile("small.jpg", "image/jpeg", 100)));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("invalidates pending compression when the user removes the cover", async () => {
    const pending = Promise.withResolvers<File>();
    mockCompress.mockReturnValueOnce(pending.promise);
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
    await act(async () => pending.resolve(createMockFile("small.jpg", "image/jpeg", 100)));
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

  it(`accepts valid image files under ${MAX_LIMIT_LABEL}MB`, async () => {
    const onUpload = vi.fn();
    const validFile = createMockFile(
      "test.jpg",
      "image/jpeg",
      1.5 * 1024 * 1024,
    ); // 1.5MB

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Create a FileList-like object
    Object.defineProperty(input, "files", {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(
      () => {
        expect(onUpload).toHaveBeenCalledWith(validFile);
      },
      { timeout: 2000 },
    );

    // Should not show error message
    expect(
      screen.queryByText(
        new RegExp(`per sota de ${MAX_LIMIT_LABEL} MB`, "i"),
      ),
    ).not.toBeInTheDocument();
  });

  it(`rejects files over ${MAX_LIMIT_LABEL}MB with correct error message`, async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      3 * 1024 * 1024,
    ); // 3MB

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
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
            `No hem pogut reduir la imatge per sota de ${MAX_LIMIT_LABEL} MB`,
            "i",
          ),
        ),
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
      2 * 1024 * 1024,
    );

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [boundaryFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(
      () => {
        expect(onUpload).toHaveBeenCalledWith(boundaryFile);
      },
      { timeout: 2000 },
    );

    // Should not show error message
    expect(
      screen.queryByText(
        new RegExp(`per sota de ${MAX_LIMIT_LABEL} MB`, "i"),
      ),
    ).not.toBeInTheDocument();
  });

  it(`accepts files just under ${MAX_LIMIT_LABEL}MB`, async () => {
    const onUpload = vi.fn();
    // 1.9MB (should pass)
    const validFile = createMockFile(
      "valid.jpg",
      "image/jpeg",
      1.9 * 1024 * 1024,
    );

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(
      () => {
        expect(onUpload).toHaveBeenCalledWith(validFile);
      },
      { timeout: 2000 },
    );

    expect(
      screen.queryByText(
        new RegExp(`per sota de ${MAX_LIMIT_LABEL} MB`, "i"),
      ),
    ).not.toBeInTheDocument();
  });

  it("compresses files over the limit when optimizer succeeds", async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      9 * 1024 * 1024,
    );
    const compressedFile = createMockFile(
      "large-compressed.jpg",
      "image/jpeg",
      1.5 * 1024 * 1024,
    );
    mockCompress.mockResolvedValueOnce(compressedFile);

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(compressedFile);
    });

    expect(screen.queryByTestId("image-upload-status")).not.toBeInTheDocument();
  });

  it("shows a descriptive error if compression throws", async () => {
    const onUpload = vi.fn();
    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      9 * 1024 * 1024,
    );
    mockCompress.mockRejectedValueOnce(new Error("failed"));

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText(/No hem pogut reduir la imatge/i),
      ).toBeInTheDocument();
    });

    expect(onUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    const onUpload = vi.fn();
    const invalidFile = createMockFile("test.pdf", "application/pdf", 1024);

    renderWithProviders(
      <ImageUploader value={null} onUpload={onUpload} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    Object.defineProperty(input, "files", {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText(/no és compatible/i),
      ).toBeInTheDocument();
    });

    expect(onUpload).not.toHaveBeenCalled();
  });
});
