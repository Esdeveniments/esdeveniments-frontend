import { NextResponse } from "next/server";
import { uploadEventImage } from "@lib/api/events";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("imageFile");

    if (!(imageFile instanceof File)) {
      return NextResponse.json(
        { error: "Falta la imatge a la sol·licitud." },
        { status: 400 }
      );
    }

    const { url, publicId } = await uploadEventImage(imageFile);
    return NextResponse.json(
      { url, publicId },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error pujant la imatge.";

    if (message === EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR) {
      return NextResponse.json(
        { error: EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR },
        { status: 413 }
      );
    }

    console.error("image-upload route error:", error);
    return NextResponse.json(
      { error: "No s'ha pogut pujar la imatge. Torna-ho a intentar." },
      { status: 500 }
    );
  }
}
