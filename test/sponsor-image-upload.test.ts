/**
 * Tests for sponsor image upload route
 *
 * Focus: Ensuring metadata save failures are properly handled
 * to prevent orphaned images in Cloudinary.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Define mock functions that will be hoisted
vi.mock("lib/api/events", () => ({
  uploadEventImage: vi.fn(),
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
import { uploadEventImage } from "lib/api/events";
import {
  fetchCheckoutSession,
  updateCheckoutSessionMetadata,
  updatePaymentIntentMetadata,
} from "lib/stripe";

// Cast to mocked functions for type safety
const mockUploadEventImage = vi.mocked(uploadEventImage);
const mockFetchCheckoutSession = vi.mocked(fetchCheckoutSession);
const mockUpdateCheckoutSessionMetadata = vi.mocked(
  updateCheckoutSessionMetadata
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
      headers: new Headers({ "x-real-ip": "127.0.0.1" }),
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
    it("rejects missing session id", async () => {
      const formData = new FormData();
      formData.set("imageFile", new File(["test"], "test.jpg"));
      const request = createMockRequest(formData);

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.errorCode).toBe("missing_session");
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
