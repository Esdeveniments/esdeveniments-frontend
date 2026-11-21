import { connection, NextResponse, type NextRequest } from "next/server";
import { resolveSession } from "@lib/auth/session";
import { fetchCategories } from "@lib/api/categories";
import {
  completeWithAiGateway,
  isAiGatewayConfigured,
  isAllowedVisionModel,
} from "@lib/api/ai-gateway";
import { normalizePosterForAi } from "@lib/api/poster-image";
import {
  acquireAccountScanLease,
  chargePosterScan,
  checkPosterQuotaAvailability,
  checkUploadAttemptLimit,
  refundAccountPosterScan,
} from "@lib/api/poster-quota";
import {
  buildPosterExtractionPrompt,
  hasExtractedEventData,
  parseAiJson,
  parsePosterExtraction,
  POSTER_EXTRACTION_JSON_SCHEMA,
} from "@lib/validation/poster-extraction";
import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearTokenCookies,
  readTokenFromRequest,
  setTokenCookies,
} from "@utils/auth-cookies";
import { MAX_TOTAL_UPLOAD_BYTES } from "@utils/constants";
import { detectImageType, isBackendImageType } from "@utils/image-validation";
import type {
  PosterExtractionApiError,
  PosterExtractionApiSuccess,
  PosterExtractionStatusResponse,
} from "types/api/poster";

const NO_STORE = { "Cache-Control": "no-store" } as const;
// Multipart framing envelope slack (boundary + part headers + CRLFs).
const MAX_POSTER_REQUEST_BYTES = MAX_TOTAL_UPLOAD_BYTES + 8192;

async function readAuthenticatedSession(request: NextRequest) {
  const idToken = readTokenFromRequest(request, ID_TOKEN_COOKIE);
  const refreshToken = readTokenFromRequest(request, REFRESH_TOKEN_COOKIE);
  const accessToken = readTokenFromRequest(request, ACCESS_TOKEN_COOKIE);
  const hasRawCookie =
    request.cookies.has(ID_TOKEN_COOKIE) ||
    request.cookies.has(ACCESS_TOKEN_COOKIE) ||
    request.cookies.has(REFRESH_TOKEN_COOKIE);

  return resolveSession({
    idToken,
    refreshToken,
    accessToken,
    hasRawCookie,
  });
}

function errorResponse(
  status: number,
  body: PosterExtractionApiError,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE, ...extraHeaders },
  });
}

/**
 * GET /api/events/extract-poster — lightweight, non-reserving availability
 * check called only when the user interacts with the poster autofill card.
 *
 * Calls `await connection()` first so Next 16 `cacheComponents` never bakes a
 * static `disabled` response during secretless CI builds.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await connection();

  const session = await readAuthenticatedSession(request);
  const signedIn = session.kind === "ok";
  const accountId =
    session.kind === "ok" ? (session.user.logtoId ?? session.user.id) : null;

  const finalize = (payload: PosterExtractionStatusResponse) => {
    const response = NextResponse.json(payload, { status: 200, headers: NO_STORE });
    if (session.kind === "ok" && session.refreshedTokens) {
      setTokenCookies(response, session.refreshedTokens);
    } else if (session.kind === "unauthorized" && session.clearCookies) {
      clearTokenCookies(response);
    }
    return response;
  };

  if (!isAiGatewayConfigured()) {
    return finalize({ state: "disabled", signedIn });
  }

  const availability = await checkPosterQuotaAvailability(accountId);
  return finalize({
    state: availability.state,
    signedIn,
    ...(availability.retryAfterSec
      ? { retryAfterSec: availability.retryAfterSec }
      : {}),
  });
}

/**
 * POST /api/events/extract-poster — authenticated multipart upload (`imageFile`).
 *
 * Defense-in-depth order:
 * 1. Verified Logto session BEFORE reading any request body bytes.
 * 2. Pre-dispatch upload attempt limiter (meters even corrupt uploads).
 * 3. Three-layer framing/size/magic-byte check (chunked, Content-Length, File).
 * 4. Bounded Sharp decode + EXIF/GPS strip + 1280x1280 fit.
 * 5. Sequence-ordered account lease + dispatch quota charge.
 * 6. Hosted ai-gateway (Gemini vision + strict json_schema) + serving-model check.
 * 7. Hardened JSON parse + deterministic Zod/date/price normalization.
 */
export async function POST(request: NextRequest): Promise<Response> {
  await connection();

  const session = await readAuthenticatedSession(request);
  if (session.kind !== "ok") {
    const response = errorResponse(
      session.kind === "transient" ? 503 : 401,
      {
        error:
          session.kind === "transient"
            ? "Session check temporarily unavailable"
            : "Authentication required",
        code: session.kind === "transient" ? "upstream_error" : "unauthorized",
      },
    );
    if (session.kind === "unauthorized" && session.clearCookies) {
      clearTokenCookies(response);
    }
    return response;
  }

  const accountId = session.user.logtoId ?? session.user.id;
  const attachRefreshedCookies = (response: NextResponse) => {
    if (session.refreshedTokens) {
      setTokenCookies(response, session.refreshedTokens);
    }
    return response;
  };

  // Pre-dispatch attempt meter (bounds even invalid uploads).
  const attempt = await checkUploadAttemptLimit(accountId);
  if (!attempt.allowed) {
    const retryAfter = attempt.retryAfterSec ?? 60;
    return attachRefreshedCookies(
      errorResponse(
        429,
        {
          error: "Too many upload attempts. Please wait a few minutes.",
          code: "rate_limited",
          retryAfterSec: retryAfter,
        },
        { "Retry-After": String(retryAfter) },
      ),
    );
  }

  const transferEncoding = (
    request.headers.get("transfer-encoding") ?? ""
  ).toLowerCase();
  if (transferEncoding.includes("chunked")) {
    return attachRefreshedCookies(
      errorResponse(411, {
        error: "Chunked transfer encoding is not supported",
        code: "invalid_image",
      }),
    );
  }

  const rawContentLength = request.headers.get("content-length");
  if (!rawContentLength) {
    return attachRefreshedCookies(
      errorResponse(411, {
        error: "Content-Length header is required",
        code: "invalid_image",
      }),
    );
  }
  const contentLength = Number(rawContentLength);
  if (
    !Number.isFinite(contentLength) ||
    contentLength <= 0 ||
    contentLength > MAX_POSTER_REQUEST_BYTES
  ) {
    return attachRefreshedCookies(
      errorResponse(413, {
        error: "Poster image is too large",
        code: "too_large",
      }),
    );
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (
    !contentType.startsWith("multipart/form-data") ||
    !contentType.includes("boundary=")
  ) {
    return attachRefreshedCookies(
      errorResponse(415, {
        error: "Expected multipart/form-data with a boundary",
        code: "invalid_image",
      }),
    );
  }

  if (!isAiGatewayConfigured()) {
    return attachRefreshedCookies(
      errorResponse(503, {
        error: "AI poster extraction is not configured",
        code: "not_configured",
      }),
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return attachRefreshedCookies(
      errorResponse(400, {
        error: "Invalid form data",
        code: "invalid_image",
      }),
    );
  }

  const file = form.get("imageFile");
  if (!(file instanceof File) || file.size <= 0) {
    return attachRefreshedCookies(
      errorResponse(400, {
        error: "Missing 'imageFile' field",
        code: "invalid_image",
      }),
    );
  }

  if (file.size > MAX_TOTAL_UPLOAD_BYTES) {
    return attachRefreshedCookies(
      errorResponse(413, {
        error: "Poster image is too large",
        code: "too_large",
      }),
    );
  }

  const detectedType = await detectImageType(file);
  if (!isBackendImageType(detectedType)) {
    return attachRefreshedCookies(
      errorResponse(415, {
        error: "Unsupported image format (JPEG or PNG required)",
        code: "invalid_image",
      }),
    );
  }

  const rawSeq = form.get("sequence");
  const parsedSeq =
    typeof rawSeq === "string" && /^\d+$/.test(rawSeq)
      ? Number(rawSeq)
      : Date.now();

  // Normalize & strip EXIF/GPS behind bounded Sharp concurrency pool.
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const normalized = await normalizePosterForAi(inputBuffer);
  if (!normalized.ok) {
    if (normalized.reason === "overloaded") {
      return attachRefreshedCookies(
        errorResponse(
          503,
          {
            error: "Poster analyzer is busy. Please try again in a moment.",
            code: "overloaded",
          },
          { "Retry-After": "10" },
        ),
      );
    }
    return attachRefreshedCookies(
      errorResponse(415, {
        error: "Could not decode poster image",
        code: "invalid_image",
      }),
    );
  }

  // Acquire sequence-ordered account scan lease (preempts older in-flight scan;
  // rejects delayed stale selections without burning quota).
  const lease = acquireAccountScanLease(accountId, parsedSeq);
  if (!lease) {
    return attachRefreshedCookies(
      errorResponse(409, {
        error: "Superseded by a newer poster selection",
        code: "upstream_error",
      }),
    );
  }

  try {
    const quota = await chargePosterScan(accountId);
    if (!quota.allowed) {
      const retryAfter = quota.retryAfterSec ?? 60;
      return attachRefreshedCookies(
        errorResponse(
          429,
          {
            error: "Poster analysis limit reached. Please try again later.",
            code: "rate_limited",
            retryAfterSec: retryAfter,
          },
          { "Retry-After": String(retryAfter) },
        ),
      );
    }

    const categories = await fetchCategories();
    const prompt = buildPosterExtractionPrompt({ categories });
    const dataUrl = `data:${normalized.mimeType};base64,${normalized.buffer.toString("base64")}`;
    const signal = AbortSignal.any([request.signal, lease.signal]);

    const aiResult = await completeWithAiGateway({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      schema: POSTER_EXTRACTION_JSON_SCHEMA,
      schemaName: "poster_event_extraction",
      temperature: 0.1,
      signal,
    });

    if (!aiResult.ok) {
      if (aiResult.reason === "aborted") {
        // Cancellation counts against daily budget to avoid rapid-abort abuse.
        return attachRefreshedCookies(
          errorResponse(408, {
            error: "Poster analysis was cancelled",
            code: "upstream_timeout",
          }),
        );
      }

      // Refund the account charge when upstream failed without producing a result.
      await refundAccountPosterScan(accountId);

      if (aiResult.reason === "not_configured") {
        return attachRefreshedCookies(
          errorResponse(503, {
            error: "AI poster extraction is not configured",
            code: "not_configured",
          }),
        );
      }
      if (aiResult.reason === "timeout") {
        return attachRefreshedCookies(
          errorResponse(504, {
            error: "Poster analysis timed out",
            code: "upstream_timeout",
          }),
        );
      }
      return attachRefreshedCookies(
        errorResponse(502, {
          error: "Poster analysis service failed",
          code: "upstream_error",
        }),
      );
    }

    if (!isAllowedVisionModel(aiResult.model)) {
      await refundAccountPosterScan(accountId);
      return attachRefreshedCookies(
        errorResponse(503, {
          error: "Vision model unavailable",
          code: "model_rejected",
        }),
      );
    }

    let rawJson: unknown;
    try {
      rawJson = parseAiJson(aiResult.content);
    } catch {
      await refundAccountPosterScan(accountId);
      return attachRefreshedCookies(
        errorResponse(502, {
          error: "Could not parse AI extraction output",
          code: "upstream_error",
        }),
      );
    }

    const extracted = parsePosterExtraction(rawJson, {
      allowedCategories: categories,
    });
    if (!extracted) {
      await refundAccountPosterScan(accountId);
      return attachRefreshedCookies(
        errorResponse(502, {
          error: "AI extraction output did not match expected schema",
          code: "upstream_error",
        }),
      );
    }

    const payload: PosterExtractionApiSuccess = {
      extracted,
      hasData: hasExtractedEventData(extracted),
      model: aiResult.model,
    };

    return attachRefreshedCookies(
      NextResponse.json(payload, { status: 200, headers: NO_STORE }),
    );
  } finally {
    lease.release();
  }
}
