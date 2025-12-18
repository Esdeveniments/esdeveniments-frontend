import { NextRequest, NextResponse } from "next/server";

import { v2 as cloudinary } from "cloudinary";
import { CloudinarySignatureResponse } from "types/api/restaurant";
import { handleApiError } from "@utils/api-error-handler";

/**
 * Cloudinary signed upload endpoint
 * Generates signed parameters for client-side upload
 */
export async function POST(request: NextRequest) {
  try {
    const { public_id, folder = "restaurant-promotions" } =
      await request.json();

    // Validate Cloudinary configuration
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

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Generate signed upload parameters
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        public_id: public_id || undefined,
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
