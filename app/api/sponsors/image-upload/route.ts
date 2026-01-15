import { NextResponse } from "next/server";
import { uploadEventImage } from "@lib/api/events";
import {
  fetchCheckoutSession,
  updateCheckoutSessionMetadata,
  updatePaymentIntentMetadata,
} from "@lib/stripe";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

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
  try {
    const formData = await request.formData();
    const sessionIdRaw = formData.get("sessionId");
    const imageFile = formData.get("imageFile");
 
    if (typeof sessionIdRaw !== "string" || sessionIdRaw.trim() === "") {
      return NextResponse.json(
        { errorCode: "missing_session", error: "Missing session id." },
        { status: 400 }
      );
    }
 
    if (!(imageFile instanceof File)) {
      return NextResponse.json(
        { errorCode: "missing_image", error: "Missing image file." },
        { status: 400 }
      );
    }

    // Validate file is actually an image
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { errorCode: "invalid_file_type", error: "File must be an image." },
        { status: 400 }
      );
    }
 
    // Gate the upload behind a paid Stripe session
    const session = await fetchCheckoutSession(sessionIdRaw);
    if (!isPaidSession(session)) {
      return NextResponse.json(
        { errorCode: "not_paid", error: "Checkout session is not paid." },
        { status: 403 }
      );
    }

    if (!isSponsorCheckoutSession(session)) {
      return NextResponse.json(
        { errorCode: "invalid_product", error: "Invalid checkout session." },
        { status: 403 }
      );
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
      imageMetadata
    );

    // Fail if session metadata wasn't saved - webhook needs it to activate sponsor
    if (!sessionMetadataSaved) {
      console.error(
        "sponsor image-upload: failed to save session metadata",
        { sessionId: sessionIdRaw, url, publicId }
      );
      return NextResponse.json(
        {
          errorCode: "metadata_save_failed",
          error: "Image uploaded but failed to link to payment session. Please contact support.",
        },
        { status: 500 }
      );
    }

    // Also update payment intent metadata so it shows in Dashboard (non-critical)
    let paymentIntentMetadataSaved = false;
    if (paymentIntentId) {
      paymentIntentMetadataSaved = await updatePaymentIntentMetadata(
        paymentIntentId,
        imageMetadata
      );
      if (!paymentIntentMetadataSaved) {
        // Log but don't fail - session metadata is the critical one
        console.warn(
          "sponsor image-upload: payment intent metadata update failed",
          { paymentIntentId }
        );
      }
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
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
 
    if (message === EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR) {
      return NextResponse.json(
        { errorCode: "image_too_large", error: EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR },
        { status: 413 }
      );
    }
 
    console.error("sponsor image-upload route error:", error);
    return NextResponse.json(
      { errorCode: "upload_failed", error: "Failed to upload image." },
      { status: 500 }
    );
  }
}

