import { NextResponse, type NextRequest } from "next/server";
import { getValidAccessToken } from "@utils/auth-cookies";
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
  const token = await getValidAccessToken();
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

  // Defense-in-depth size guard (three layers):
  //   1. Reject Transfer-Encoding: chunked + require a well-formed
  //      Content-Length so signatures on Content-Length actually constrain
  //      the body. Without these, an attacker can stream chunks up to the
  //      upstream proxy's max (Cloudflare free tier = 100 MB) and force
  //      formData() to buffer it all before our file.size check runs.
  //   2. Content-Length upper bound (cheap, rejects obviously oversized
  //      requests before the multipart parser is invoked).
  //   3. file.size post-check after parsing (binding — catches clients that
  //      spoof Content-Length while obeying the framing rules: the only
  //      honest over-limit case is a client that's interleaved framing
  //      tricks with a body larger than declared).
  //
  // TODO(ops): pair this with a Cloudflare "Max Upload Size" zone setting
  // (suggested 25 MB) so even chunked/stale-framed requests stop at the
  // edge and never reach Traefik/Coolify bandwidth. See docs/incidents
  // search: "body-size" for related context. Until that is configured,
  // layer 1 below is the only thing standing between an attacker and the
  // Node multipart parser.
  const transferEncoding = (
    request.headers.get("transfer-encoding") ?? ""
  ).toLowerCase();
  if (transferEncoding.includes("chunked")) {
    return NextResponse.json(
      { error: "Chunked transfer encoding is not supported" },
      { status: 411, headers: NO_STORE },
    );
  }
  const rawContentLength = request.headers.get("content-length");
  if (!rawContentLength) {
    return NextResponse.json(
      { error: "Content-Length header is required" },
      { status: 411, headers: NO_STORE },
    );
  }
  const contentLengthHeader = Number(rawContentLength);
  // +8192 envelope allowance: a multipart body needs ~200–400 bytes of
  // boundary + part headers + CRLFs around the file bytes. Without this, a
  // legitimate 2 MB file produces Content-Length ≈ 2.0003 MB and would 413
  // here even though the file.size post-check below would have allowed it.
  // The 8 KB slack is well under the Cloudflare free-tier 100 MB ceiling
  // (see the TODO(ops) note above) and gives the file-size postcheck the
  // final say on the actual payload. PR review thread 121V was the trigger.
  const MAX_AVATAR_REQUEST_BYTES = MAX_AVATAR_BYTES + 8192;
  if (
    !Number.isFinite(contentLengthHeader) ||
    contentLengthHeader < 0 ||
    contentLengthHeader > MAX_AVATAR_REQUEST_BYTES
  ) {
    return NextResponse.json(
      { error: "Avatar too large (max 2 MB)" },
      { status: 413, headers: NO_STORE },
    );
  }
  // Require a well-formed multipart Content-Type with a boundary parameter;
  // an empty / malformed request that bypasses the multipart parser would
  // otherwise fall through to formData() and surface as a generic 400.
  const declaredContentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (
    !declaredContentType.startsWith("multipart/form-data") ||
    !declaredContentType.includes("boundary=")
  ) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a boundary" },
      { status: 415, headers: NO_STORE },
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
