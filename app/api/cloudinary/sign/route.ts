// DISABLED: Restaurant promotions feature is currently disabled
// This endpoint can be re-enabled when restaurant promotions are needed
// 
// Original implementation is preserved below in comments for reference.
// To re-enable: uncomment the code below and remove the simple 404 handler.

import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "Restaurant promotions are currently disabled" },
    { status: 404 }
  );
}

/* 
Original implementation (commented out):

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { CloudinarySignatureResponse } from "types/api/restaurant";
import { handleApiError } from "@utils/api-error-handler";

function generateCloudinarySignature(
  params: Record<string, string | number | undefined>,
  apiSecret: string
): string {
  const sortedParams = Object.keys(params)
    .filter((key) => params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signatureString = sortedParams + apiSecret;
  return crypto.createHash("sha1").update(signatureString).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { public_id, folder = "restaurant-promotions" } =
      await request.json();

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary configuration missing");
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = generateCloudinarySignature(
      {
        timestamp: timestamp.toString(),
        folder,
        ...(public_id && { public_id }),
        transformation: "w_800,h_600,c_fill,q_auto,f_auto",
      },
      process.env.CLOUDINARY_API_SECRET
    );

    const response: CloudinarySignatureResponse = {
      signature,
      timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "/api/cloudinary/sign", {
      errorMessage: "Failed to generate upload signature",
    });
  }
}
*/
