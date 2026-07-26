import { NextResponse, type NextRequest } from "next/server";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import {
  deleteUserAvatarExternal,
  uploadUserAvatarExternal,
} from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB hard cap; matches MAX_TOTAL_UPLOAD_BYTES
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

async function requireAuthCookie(): Promise<
  { ok: true; token: string } | { ok: false; response: Response }
> {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: NO_STORE },
      ),
    };
  }
  return { ok: true, token };
}

// POST /api/users/me/avatar — multipart upload with field `avatarFile`.
// Returns { avatarUrl: string } per backend handoff. Same auth model as
// profile: HttpOnly cookie → Bearer. The external wrapper handles the
// backend auth + HMAC layer.
export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireAuthCookie();
  if (!auth.ok) return auth.response;

  // Boundary / size guard at the edge so a giant blob never allocates a
  // multipart parser and a wrong file type never wastes a backend round-trip.
  const contentLengthHeader = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (Number.isFinite(contentLengthHeader) && contentLengthHeader > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar too large (max 2 MB)" },
      { status: 413, headers: NO_STORE },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400, headers: NO_STORE },
    );
  }
  const file = form.get("avatarFile");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'avatarFile' field" },
      { status: 400, headers: NO_STORE },
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar too large (max 2 MB)" },
      { status: 413, headers: NO_STORE },
    );
  }
  if (!file.type || !ALLOWED_AVATAR_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported avatar format" },
      { status: 415, headers: NO_STORE },
    );
  }

  try {
    const result = await uploadUserAvatarExternal(file, auth.token);
    if (!result) {
      return NextResponse.json(
        { error: "Avatar upload failed" },
        { status: 502, headers: NO_STORE },
      );
    }
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (e) {
    return handleApiError(e, "/api/users/me/avatar", {
      fallbackData: null,
    });
  }
}

// DELETE /api/users/me/avatar — clear the signed-in user's avatar.
export async function DELETE(_request: NextRequest): Promise<Response> {
  const auth = await requireAuthCookie();
  if (!auth.ok) return auth.response;

  try {
    const result = await deleteUserAvatarExternal(auth.token);
    return NextResponse.json(
      { ok: result },
      { status: result ? 200 : 502, headers: NO_STORE },
    );
  } catch (e) {
    return handleApiError(e, "/api/users/me/avatar", {
      fallbackData: null,
    });
  }
}
