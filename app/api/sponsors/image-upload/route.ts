import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { uploadEventImage } from "@lib/api/events";
import {
  fetchCheckoutSession,
  updateCheckoutSessionMetadata,
  updatePaymentIntentMetadata,
} from "@lib/stripe";
import { activateSponsorImage } from "@lib/db/sponsors";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";
import { createRateLimiter } from "@utils/rate-limit";

// 10 uploads per minute per IP — prevents abuse of the public image upload
const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });

// Image magic bytes for server-side content validation
// Client-provided MIME types can be spoofed, so we verify actual file content
const IMAGE_MAGIC_BYTES: { type: string; bytes: number[] }[] = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    type: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  // WebP handled separately below (RIFF header is shared with WAV, AVI, etc.)
];

/**
 * Validate file content by checking magic bytes.
 * Returns true if the file starts with known image magic bytes.
 */
async function isValidImageContent(file: File): Promise<boolean> {
  try {
    // Read first 12 bytes (enough for all magic byte patterns)
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const { bytes: magicBytes } of IMAGE_MAGIC_BYTES) {
      if (magicBytes.every((byte, index) => bytes[index] === byte)) {
        return true;
      }
    }

    // Special case for WebP: check for "WEBP" at offset 8 after RIFF
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    ) {
      // Check if bytes 8-11 are "WEBP"
      if (
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isPaidSession(session: unknown): boolean {
  if (!isRecord(session)) return false;
  const paymentStatus = getString(session.payment_status);
  const status = getString(session.status);
  // Stripe Checkout Session typically uses payment_status=paid when completed.
  // Some API versions also expose status=complete.
  return paymentStatus === "paid" || status === "complete";
}

function isSponsorCheckoutSession(session: unknown): boolean {
  if (!isRecord(session)) return false;
  const metadata = session.metadata;
  if (!isRecord(metadata)) return false;
  return getString(metadata.product) === "sponsor_banner";
}

function getPaymentIntentId(session: unknown): string | null {
  if (!isRecord(session)) return null;
  return getString(session.payment_intent);
}

export async function POST(request: Request) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const formData = await request.formData();
    const sessionIdRaw = formData.get("sessionId");
    const imageFile = formData.get("imageFile");

    if (typeof sessionIdRaw !== "string" || sessionIdRaw.trim() === "") {
      return NextResponse.json(
        { errorCode: "missing_session", error: "Missing session id." },
        { status: 400 },
      );
    }

    if (!(imageFile instanceof File)) {
      return NextResponse.json(
        { errorCode: "missing_image", error: "Missing image file." },
        { status: 400 },
      );
    }

    // Validate file is actually an image (client MIME type check)
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { errorCode: "invalid_file_type", error: "File must be an image." },
        { status: 400 },
      );
    }

    // Server-side validation: check actual file content via magic bytes
    // Client-provided MIME types can be spoofed by malicious clients
    const isValidContent = await isValidImageContent(imageFile);
    if (!isValidContent) {
      return NextResponse.json(
        {
          errorCode: "invalid_file_content",
          error: "File is not a valid image.",
        },
        { status: 400 },
      );
    }

    // Gate the upload behind a paid Stripe session
    const session = await fetchCheckoutSession(sessionIdRaw);
    if (!isPaidSession(session)) {
      return NextResponse.json(
        { errorCode: "not_paid", error: "Checkout session is not paid." },
        { status: 403 },
      );
    }

    if (!isSponsorCheckoutSession(session)) {
      return NextResponse.json(
        { errorCode: "invalid_product", error: "Invalid checkout session." },
        { status: 403 },
      );
    }

    // Prevent session replay: check if image was already uploaded for this session
    // This also mitigates TOCTOU race conditions - first successful upload wins
    if (isRecord(session)) {
      const metadata = session.metadata;
      if (isRecord(metadata) && getString(metadata.sponsor_image_url)) {
        return NextResponse.json(
          {
            errorCode: "already_uploaded",
            error: "Image already uploaded for this session.",
          },
          { status: 409 },
        );
      }
    }

    // Get payment intent ID to update its metadata too
    const paymentIntentId = getPaymentIntentId(session);

    const { url, publicId } = await uploadEventImage(imageFile);

    const imageMetadata = {
      sponsor_image_url: url,
      sponsor_image_public_id: publicId,
      sponsor_image_uploaded_at: new Date().toISOString(),
    };

    // Update checkout session metadata (critical for webhook to find the image)
    const sessionMetadataSaved = await updateCheckoutSessionMetadata(
      sessionIdRaw,
      imageMetadata,
    );

    // Fail if session metadata wasn't saved - webhook needs it to activate sponsor
    if (!sessionMetadataSaved) {
      console.error("sponsor image-upload: failed to save session metadata", {
        sessionId: sessionIdRaw,
        url,
        publicId,
      });
      return NextResponse.json(
        {
          errorCode: "metadata_save_failed",
          error:
            "Image uploaded but failed to link to payment session. Please contact support.",
        },
        { status: 500 },
      );
    }

    // Also update payment intent metadata so it shows in Dashboard (non-critical)
    let paymentIntentMetadataSaved = false;
    if (paymentIntentId) {
      paymentIntentMetadataSaved = await updatePaymentIntentMetadata(
        paymentIntentId,
        imageMetadata,
      );
      if (!paymentIntentMetadataSaved) {
        // Log but don't fail - session metadata is the critical one
        console.warn(
          "sponsor image-upload: payment intent metadata update failed",
          { paymentIntentId },
        );
      }
    }

    // Activate sponsor in database (sets status from 'pending_image' to 'active')
    // Non-critical: wrap in try/catch to avoid failing the request after image + Stripe
    // metadata are already saved. If this fails, later reconciliation or webhook retry
    // will pick it up.
    try {
      const dbActivated = await activateSponsorImage(sessionIdRaw, url);
      if (dbActivated) {
        console.log("sponsor image-upload: sponsor activated in DB", {
          sessionId: sessionIdRaw,
        });
      } else {
        // Non-critical: webhook may not have fired yet, or DB may be unavailable.
        // The webhook will pick up the image from Stripe session metadata later.
        console.warn(
          "sponsor image-upload: DB activation skipped (sponsor not found or DB unavailable)",
          { sessionId: sessionIdRaw },
        );
      }
    } catch (dbError) {
      console.warn("sponsor image-upload: DB activation threw an error", {
        sessionId: sessionIdRaw,
        error: dbError,
      });
      captureException(dbError, {
        tags: { api: "sponsors-image-upload", stage: "db-activation" },
      });
    }

    return NextResponse.json(
      {
        success: true,
        url,
        publicId,
        metadataSaved: sessionMetadataSaved,
        paymentIntentMetadataSaved,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";

    if (message === EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR) {
      return NextResponse.json(
        {
          errorCode: "image_too_large",
          error: EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR,
        },
        { status: 413 },
      );
    }

    console.error("sponsor image-upload route error:", error);
    captureException(error, {
      tags: { api: "sponsors-image-upload" },
    });
    return NextResponse.json(
      { errorCode: "upload_failed", error: "Failed to upload image." },
      { status: 500 },
    );
  }
}
