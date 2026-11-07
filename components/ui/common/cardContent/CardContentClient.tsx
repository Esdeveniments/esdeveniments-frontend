"use client";
import CardLinkClient from "./CardLinkClient";
import { CardContentProps } from "types/props";
import { useTranslations, useLocale } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import CardLayout from "./CardLayout";
import { prepareCardContentData } from "./prepareCardContentData";

export default function CardContentClient({
  event,
  isPriority = false,
  initialIsFavorite = false,
}: CardContentProps) {
  const tCard = useTranslations("Components.CardContent");
  const tCategories = useTranslations("Config.Categories");
  const locale = (useLocale() || DEFAULT_LOCALE) as AppLocale;
  const card = prepareCardContentData({
    event,
    variant: "standard",
    locale,
    tCard,
    tCategories,
    isFavorite: initialIsFavorite,
  });

  return (
    <CardLayout
      card={card}
      isPriority={isPriority}
      renderLink={(props) => <CardLinkClient {...props} />}
    />
  );
}
