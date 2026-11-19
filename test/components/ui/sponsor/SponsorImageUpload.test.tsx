import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../../utils/renderWithProviders";
import SponsorImageUpload from "@components/ui/sponsor/SponsorImageUpload";
import { IMAGE_UPLOAD_ACCEPT, MAX_SPONSOR_IMAGE_BYTES } from "@utils/constants";
import type { ImageUploadResult } from "types/upload";

const mockPrepare = vi.fn<(file: File, options: unknown) => Promise<ImageUploadResult>>();
vi.mock("@utils/image-optimizer", () => ({
  prepareImageForUpload: (file: File, options: unknown) => mockPrepare(file, options),
}));

// Mock i18n routing
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/navigation (required by FilterLoadingProvider in renderWithProviders)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Image constructor for dimension validation
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 728;
  height = 150;
  set src(_: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}
global.Image = MockImage as unknown as typeof Image;

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([], name, { type });
  Object.defineProperty(file, "size", { value: size, writable: false });
  return file;
};

describe("SponsorImageUpload image preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    renderWithProviders(
      <SponsorImageUpload
        sessionId="cs_test_123"
        placeSlug="barcelona"
        placeName="Barcelona"
      />,
    );

  const getFileInput = () =>
    document.querySelector('input[type="file"]') as HTMLInputElement;

  const selectFile = (input: HTMLInputElement, file: File) => {
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    fireEvent.change(input);
  };

  it("opens the picker for any image", () => {
    renderComponent();
    expect(getFileInput()).toHaveAttribute("accept", IMAGE_UPLOAD_ACCEPT);
  });

  it("enables upload once the prepared file is ready, within the sponsor limit", async () => {
    const picked = createMockFile("banner.webp", "image/webp", 7 * 1024 * 1024);
    const prepared = createMockFile("banner.jpg", "image/jpeg", 1024);
    mockPrepare.mockResolvedValueOnce({ ok: true, file: prepared, detectedType: "image/webp" });
    renderComponent();

    selectFile(getFileInput(), picked);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /puja la imatge/i })).not.toBeDisabled(),
    );
    expect(mockPrepare).toHaveBeenCalledWith(picked, { maxBytes: MAX_SPONSOR_IMAGE_BYTES });
    expect(screen.getByText("banner.jpg")).toBeInTheDocument();
  });

  it("explains a failure with the sponsor limit and keeps upload disabled", async () => {
    mockPrepare.mockResolvedValueOnce({ ok: false, reason: "too_large", detectedType: "image/jpeg" });
    renderComponent();

    selectFile(getFileInput(), createMockFile("huge.jpg", "image/jpeg", 20 * 1024 * 1024));

    expect(
      await screen.findByText(/No hem pogut reduir la imatge per sota de 5 MB/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /puja la imatge/i })).toBeDisabled();
  });

  it("passes a dropped file with no type on to preparation", async () => {
    mockPrepare.mockResolvedValueOnce({ ok: false, reason: "undecodable", detectedType: null });
    renderComponent();
    const file = createMockFile("photo", "", 1024);

    fireEvent.drop(getFileInput().parentElement!, { dataTransfer: { files: [file] } });

    expect(await screen.findByText(/No hem pogut llegir aquesta imatge/)).toBeInTheDocument();
    expect(mockPrepare).toHaveBeenCalledWith(file, { maxBytes: MAX_SPONSOR_IMAGE_BYTES });
  });
});
