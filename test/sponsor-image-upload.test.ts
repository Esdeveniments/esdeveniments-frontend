/**
 * Tests for sponsor image upload route
 *
 * Focus: Ensuring metadata save failures are properly handled
 * to prevent orphaned images in object storage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Define mock functions that will be hoisted
vi.mock("lib/api/sponsors-external", () => ({
  uploadSponsorImage: vi.fn(),
}));

vi.mock("lib/stripe", () => ({
  fetchCheckoutSession: vi.fn(),
  updateCheckoutSessionMetadata: vi.fn(),
  updatePaymentIntentMetadata: vi.fn(),
}));

// Mock rate limiter to avoid in-memory counter accumulating across watch-mode
// re-runs (shared 127.0.0.1 key could hit 10/min threshold → flaky 429s)
vi.mock("utils/rate-limit", () => ({
  createRateLimiter: () => ({ check: () => null }),
}));

// Import after mocks are set up
import { POST } from "app/api/sponsors/image-upload/route";
import { uploadSponsorImage } from "lib/api/sponsors-external";
import {
  fetchCheckoutSession,
  updateCheckoutSessionMetadata,
  updatePaymentIntentMetadata,
} from "lib/stripe";

// Cast to mocked functions for type safety
const mockUploadEventImage = vi.mocked(uploadSponsorImage);
const mockFetchCheckoutSession = vi.mocked(fetchCheckoutSession);
const mockUpdateCheckoutSessionMetadata = vi.mocked(
  updateCheckoutSessionMetadata,
);
const mockUpdatePaymentIntentMetadata = vi.mocked(updatePaymentIntentMetadata);

/**
 * Create a mock file with valid JPEG magic bytes.
 * The route validates actual file content via magic bytes using file.slice().arrayBuffer().
 */
function createMockJpegFile(name = "test.jpg"): File {
  // JPEG magic bytes: 0xFF 0xD8 0xFF (SOI + APP0 marker)
  const jpegMagicBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  return new File([jpegMagicBytes], name, { type: "image/jpeg" });
}

describe("Sponsor Image Upload Route", () => {
  const validSessionId = "cs_test_valid_session";
  const validPaymentIntentId = "pi_test_valid_intent";

  const createMockFormData = (sessionId: string, imageFile?: File) => {
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    if (imageFile) {
      formData.set("imageFile", imageFile);
    }
    return formData;
  };

  const createMockRequest = (formData: FormData) => {
    return {
      formData: () => Promise.resolve(formData),
      headers: new Headers({
        "x-real-ip": "127.0.0.1",
        "content-type": "multipart/form-data; boundary=----boundary",
      }),
    } as unknown as Request;
  };

  const createMockRequestWithoutContentType = (formData: FormData) => {
    return {
      formData: () => Promise.resolve(formData),
      headers: new Headers({ "x-real-ip": "127.0.0.1" }),
    } as unknown as Request;
  };

  const createMockRequestWithBrokenBody = () => {
    return {
      formData: () =>
        Promise.reject(new TypeError("Failed to parse body as FormData.")),
      headers: new Headers({
        "x-real-ip": "127.0.0.1",
        "content-type": "multipart/form-data; boundary=----boundary",
      }),
    } as unknown as Request;
  };

  const mockPaidSponsorSession = {
    payment_status: "paid",
    status: "complete",
    payment_intent: validPaymentIntentId,
    metadata: {
      product: "sponsor_banner",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: session is paid and valid
    mockFetchCheckoutSession.mockResolvedValue(mockPaidSponsorSession);

    // Default: image upload succeeds
    mockUploadEventImage.mockResolvedValue({
      url: "https://cloudinary.com/test-image.jpg",
      publicId: "test-public-id",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("metadata save failure handling", () => {
    it("returns error when session metadata save fails", async () => {
      const testFile = createMockJpegFile();
      const formData = createMockFormData(validSessionId, testFile);
      const request = createMockRequest(formData);

      // Session metadata save fails
      mockUpdateCheckoutSessionMetadata.mockResolvedValue(false);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.errorCode).toBe("metadata_save_failed");
      expect(json.success).toBeUndefined();

      // Verify image was uploaded (the orphaned scenario)
      expect(mockUploadEventImage).toHaveBeenCalled();
    });

    it("returns success when session metadata saves but payment intent fails", async () => {
      const testFile = createMockJpegFile();
      const formData = createMockFormData(validSessionId, testFile);
      const request = createMockRequest(formData);

      // Session metadata saves successfully
      mockUpdateCheckoutSessionMetadata.mockResolvedValue(true);
      // Payment intent metadata fails (non-critical)
      mockUpdatePaymentIntentMetadata.mockResolvedValue(false);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.metadataSaved).toBe(true);
      expect(json.paymentIntentMetadataSaved).toBe(false);
    });

    it("returns success when both metadata saves succeed", async () => {
      const testFile = createMockJpegFile();
      const formData = createMockFormData(validSessionId, testFile);
      const request = createMockRequest(formData);

      mockUpdateCheckoutSessionMetadata.mockResolvedValue(true);
      mockUpdatePaymentIntentMetadata.mockResolvedValue(true);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.metadataSaved).toBe(true);
      expect(json.paymentIntentMetadataSaved).toBe(true);
      expect(json.url).toBe("https://cloudinary.com/test-image.jpg");
    });
  });

  describe("validation", () => {
    it.each([
      ["webp", "image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
      ["gif labelled as png", "image/png", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]],
      ["webp labelled as jpeg", "image/jpeg", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
    ])("rejects %s content with invalid_file_type", async (_name, type, bytes) => {
      const file = new File([new Uint8Array(bytes)], "a.img", { type });
      const response = await POST(createMockRequest(createMockFormData(validSessionId, file)));
      expect(response.status).toBe(400);
      expect((await response.json()).errorCode).toBe("invalid_file_type");
      expect(mockUploadEventImage).not.toHaveBeenCalled();
    });

    it("accepts PNG content", async () => {
      const png = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
        "a.png",
        { type: "image/png" },
      );
      mockUpdateCheckoutSessionMetadata.mockResolvedValue(true);
      const response = await POST(createMockRequest(createMockFormData(validSessionId, png)));
      expect(response.status).toBe(200);
    });

    it("rejects missing session id", async () => {
      const formData = new FormData();
      formData.set("imageFile", new File(["test"], "test.jpg"));
      const request = createMockRequest(formData);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errorCode).toBe("missing_session");
    });

    it("rejects request without multipart/form-data content-type", async () => {
      const formData = createMockFormData(validSessionId, createMockJpegFile());
      const request = createMockRequestWithoutContentType(formData);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errorCode).toBe("invalid_content_type");
    });

    it("returns 413 when body cannot be parsed as FormData (body truncation)", async () => {
      const request = createMockRequestWithBrokenBody();

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(413);
      expect(json.errorCode).toBe("image_too_large");
    });

    it("rejects missing image file", async () => {
      const formData = createMockFormData(validSessionId);
      const request = createMockRequest(formData);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errorCode).toBe("missing_image");
    });

    it("rejects unpaid session", async () => {
      const testFile = createMockJpegFile();
      const formData = createMockFormData(validSessionId, testFile);
      const request = createMockRequest(formData);

      mockFetchCheckoutSession.mockResolvedValue({
        payment_status: "unpaid",
        metadata: { product: "sponsor_banner" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.errorCode).toBe("not_paid");
    });

    it("rejects non-sponsor checkout session", async () => {
      const testFile = createMockJpegFile();
      const formData = createMockFormData(validSessionId, testFile);
      const request = createMockRequest(formData);

      mockFetchCheckoutSession.mockResolvedValue({
        payment_status: "paid",
        metadata: { product: "other_product" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.errorCode).toBe("invalid_product");
    });
  });
});
