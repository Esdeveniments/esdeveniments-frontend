import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import type { CardLabels } from "types/props";

/**
 * Card text, read once per list and passed to every card. Cards stay sync:
 * an async card makes React stream each one as its own hidden segment plus
 * an inline `$RS` script (two per card with its link).
 * Callers that hold `rootLocale()` pass it, so this doesn't read `headers()`.
 */
export async function getCardLabels(locale?: AppLocale): Promise<CardLabels> {
  const resolved = locale ?? (await getLocaleSafely());
  const [tCard, tCategories] = await Promise.all([
    getTranslations({ locale: resolved, namespace: "Components.CardContent" }),
    getTranslations({ locale: resolved, namespace: "Config.Categories" }),
  ]);
  return { locale: resolved, tCard, tCategories };
}
