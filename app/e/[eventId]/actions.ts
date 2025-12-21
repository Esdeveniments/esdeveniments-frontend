"use server";

import { captureException } from "@sentry/nextjs";
import { createKeyedCache } from "@lib/api/cache";
import { getCacheKey } from "./translation-utils";

const TRANSLATION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DEFAULT_BASE_URL = "https://api-free.deepl.com";
const ERROR_API_REQUEST_FAILED = "API_REQUEST_FAILED";
const ERROR_EMPTY_RESPONSE = "EMPTY_RESPONSE";

// Cache translations for 24h to reduce API calls and improve performance
// This helps stay within free tier limits by avoiding duplicate translations
const { cache: translationCache } =
  createKeyedCache<string>(TRANSLATION_TTL_MS);

function getBaseUrl() {
  const base = process.env.DEEPL_API_BASE;
  if (base && typeof base === "string") {
    return base.replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

function buildRequestBody(trimmed: string, targetLang: "en" | "es") {
  // Catalan is a Beta language, so we need to enable beta languages.
  // DeepL expects `text` as an array of strings.
  return {
    text: [trimmed],
    target_lang: targetLang.toUpperCase(),
    source_lang: "CA",
    enable_beta_languages: true,
  };
}

async function fetchTranslationFromDeepL(args: {
  trimmed: string;
  targetLang: "en" | "es";
  authKey: string;
  baseUrl: string;
}): Promise<string> {
  const { trimmed, targetLang, authKey, baseUrl } = args;
  const requestBody = buildRequestBody(trimmed, targetLang);
  const url = `${baseUrl}/v2/translate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${authKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url,
      targetLang,
    };
    console.error("DeepL translation failed", errorDetails);

    if (process.env.NODE_ENV === "production") {
      captureException(new Error("DeepL translation API request failed"), {
        tags: {
          feature: "translate-description",
          error_type: "api-request-failed",
        },
        extra: errorDetails,
      });
    }

    // Throw sentinel error to prevent caching failures.
    throw new Error(ERROR_API_REQUEST_FAILED);
  }

  const json = (await response.json()) as {
    translations?: Array<{
      text?: string;
      detected_source_language?: string;
    }>;
  };

  const result = json?.translations?.[0]?.text;
  if (!result) {
    console.error(
      "[translateDescription] No translation text in response:",
      json
    );

    if (process.env.NODE_ENV === "production") {
      captureException(new Error("DeepL translation returned empty response"), {
        tags: {
          feature: "translate-description",
          error_type: "empty-response",
        },
        extra: { targetLang, response: json },
      });
    }

    // Throw sentinel error to prevent caching empty responses.
    throw new Error(ERROR_EMPTY_RESPONSE);
  }

  return result;
}

export async function translateDescription({
  text,
  targetLang,
}: {
  text: string;
  targetLang: "en" | "es";
}) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { ok: false as const, error: "empty" as const };
  }

  if (targetLang !== "en" && targetLang !== "es") {
    return { ok: false as const, error: "unsupported-lang" as const };
  }

  const authKey = process.env.DEEPL_API_KEY;
  if (!authKey) {
    console.error("[translateDescription] DEEPL_API_KEY is not set");
    return { ok: false as const, error: "missing-key" as const };
  }

  const cacheKey = getCacheKey(trimmed, targetLang);

  try {
    // Cache automatically handles TTL (24h) and only calls fetcher on cache miss.
    // Only successful translations are cached; rejected fetchers do not populate the cache.
    const translatedText = await translationCache(cacheKey, async () => {
      return await fetchTranslationFromDeepL({
        trimmed,
        targetLang,
        authKey,
        baseUrl: getBaseUrl(),
      });
    });

    return { ok: true as const, translation: translatedText };
  } catch (error) {
    // Handle errors from cache fetcher - don't cache these
    if (error instanceof Error && error.message === ERROR_API_REQUEST_FAILED) {
      return { ok: false as const, error: "request-failed" as const };
    }
    if (error instanceof Error && error.message === ERROR_EMPTY_RESPONSE) {
      return { ok: false as const, error: "empty-response" as const };
    }

    console.error("DeepL translation error", error);

    if (process.env.NODE_ENV === "production") {
      captureException(error, {
        tags: {
          feature: "translate-description",
          error_type: "unexpected-error",
        },
        extra: { targetLang },
      });
    }

    return { ok: false as const, error: "unexpected-error" as const };
  }
}
