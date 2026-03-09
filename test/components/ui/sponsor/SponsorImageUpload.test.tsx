import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../../utils/renderWithProviders";
import SponsorImageUpload from "@components/ui/sponsor/SponsorImageUpload";
import { MAX_SPONSOR_IMAGE_BYTES } from "@utils/constants";

// Mock i18n routing
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn() }),
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

describe("SponsorImageUpload file size validation", () => {
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

  it("accepts a file smaller than MAX_SPONSOR_IMAGE_BYTES", async () => {
    renderComponent();
    const file = createMockFile(
      "small.jpg",
      "image/jpeg",
      MAX_SPONSOR_IMAGE_BYTES - 1,
    );
    selectFile(getFileInput(), file);

    await waitFor(() => {
      expect(
        screen.queryByText(/supera el límit permès/i),
      ).not.toBeInTheDocument();
    });
  });

  it("rejects a file equal to MAX_SPONSOR_IMAGE_BYTES", async () => {
    renderComponent();
    const file = createMockFile(
      "exact.jpg",
      "image/jpeg",
      MAX_SPONSOR_IMAGE_BYTES,
    );
    selectFile(getFileInput(), file);

    await waitFor(() => {
      expect(screen.getByText(/supera el límit permès/i)).toBeInTheDocument();
    });
  });

  it("rejects a file larger than MAX_SPONSOR_IMAGE_BYTES", async () => {
    renderComponent();
    const file = createMockFile(
      "large.jpg",
      "image/jpeg",
      MAX_SPONSOR_IMAGE_BYTES + 1,
    );
    selectFile(getFileInput(), file);

    await waitFor(() => {
      expect(screen.getByText(/supera el límit permès/i)).toBeInTheDocument();
    });
  });

  it("clears file state when file exceeds size limit (upload button stays disabled)", async () => {
    renderComponent();
    const file = createMockFile(
      "large.jpg",
      "image/jpeg",
      MAX_SPONSOR_IMAGE_BYTES + 1,
    );
    selectFile(getFileInput(), file);

    await waitFor(() => {
      expect(screen.getByText(/supera el límit permès/i)).toBeInTheDocument();
    });

    // Upload button should not be enabled (no file in state)
    const uploadButton = screen.queryByRole("button", {
      name: /puja la imatge/i,
    });
    expect(uploadButton).not.toBeInTheDocument();
  });
});
