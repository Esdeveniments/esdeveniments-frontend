import { NextResponse, type NextRequest } from "next/server";
import { getValidAccessToken } from "@utils/auth-cookies";
import { patchMeProfileExternal } from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";
import { profileUpdateSchema } from "lib/validation/auth";
import type { ProfileUpdateRequestDTO } from "types/api/user";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const BAD_REQUEST = (message: string) =>
  NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });

// PATCH /api/users/me/profile — edit the signed-in user's profile fields
// (username, displayName, bio). Backend returns 400 (invalid format),
// 409 (collision: username taken), or 403 (no session). The route delegates
// auth via the HttpOnly `auth_token` cookie read here (same origin as the
// page) and forwards it as a Bearer header to the backend.
//
// Onboarding completion is signaled by `profileCompleted: true` returning from
// /api/auth/me on the next GET — the operator's only job is to keep that
// cookie user fresh.
export async function PATCH(request: NextRequest): Promise<Response> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401, headers: NO_STORE },
    );
  }

  // Defense-in-depth: re-validate the payload shape on the server. The
  // client also validates (live feedback) but a bot/curl hitting the route
  // with garbage should 400 here without ever reaching the backend.
  let body: ProfileUpdateRequestDTO;
  try {
    const json: unknown = await request.json();
    const parsed = profileUpdateSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid payload";
      return BAD_REQUEST(first);
    }
    body = parsed.data;
  } catch {
    return BAD_REQUEST("Invalid JSON body");
  }

  try {
    const updated = await patchMeProfileExternal(body, accessToken);
    if (!updated) {
      return NextResponse.json(
        { error: "Profile update failed" },
        { status: 502, headers: NO_STORE },
      );
    }
    return NextResponse.json(updated, { status: 200, headers: NO_STORE });
  } catch (e) {
    return handleApiError(e, "/api/users/me/profile", {
      fallbackData: null,
    });
  }
}
