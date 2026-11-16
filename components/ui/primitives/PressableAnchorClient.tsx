"use client";

import { useLocale } from "next-intl";

import type { PressableAnchorProps } from "types/ui";
import { DEFAULT_LOCALE } from "types/i18n";
import { LocalizedPressableAnchor } from "./LocalizedPressableAnchor";

export default function PressableAnchorClient(props: PressableAnchorProps) {
  const locale = useLocale?.() || DEFAULT_LOCALE;
  return <LocalizedPressableAnchor {...props} locale={locale} />;
}

