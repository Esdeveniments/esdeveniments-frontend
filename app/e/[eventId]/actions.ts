"use server";

const translationCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

const TRANSLATION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DEFAULT_BASE_URL = "https://api-free.deepl.com";

function getCacheKey(text: string, targetLang: "en" | "es") {
  return `${targetLang}:${text}`;
}

function getBaseUrl() {
  const base = process.env.DEEPL_API_BASE;
  if (base && typeof base === "string") {
    return base.replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
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
    return { ok: false as const, error: "missing-key" as const };
  }

  const cacheKey = getCacheKey(trimmed, targetLang);
  const now = Date.now();
  const cached = translationCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ok: true as const, translation: cached.value };
  }

  const body = new URLSearchParams({
    text: trimmed,
    target_lang: targetLang.toUpperCase(),
    source_lang: "CA",
  });

  const url = `${getBaseUrl()}/v2/translate`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `DeepL-Auth-Key ${authKey}`,
      },
      body,
    });

    if (!response.ok) {
      console.error("DeepL translation failed", response.status, await response.text());
      return { ok: false as const, error: "request-failed" as const };
    }

    const json = (await response.json()) as {
      translations?: Array<{ text?: string }>;
    };
    const translatedText = json?.translations?.[0]?.text;
    if (!translatedText) {
      return { ok: false as const, error: "empty-response" as const };
    }

    translationCache.set(cacheKey, {
      value: translatedText,
      expiresAt: now + TRANSLATION_TTL_MS,
    });

    return { ok: true as const, translation: translatedText };
  } catch (error) {
    console.error("DeepL translation error", error);
    return { ok: false as const, error: "unexpected-error" as const };
  }
}




