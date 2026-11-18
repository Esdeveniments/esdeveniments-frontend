"use client";

import { useMemo } from "react";
import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";
import { mergeMessages } from "@lib/i18n/merge-messages";
import type { ScopedMessagesProviderProps } from "types/i18n";

// A nested provider's `messages` replace the parent's, so merge them here.
export default function ScopedMessagesProvider({
  messages,
  children,
}: ScopedMessagesProviderProps) {
  const locale = useLocale();
  const parent = useMessages();
  const merged = useMemo(
    () => mergeMessages(parent as Record<string, unknown>, messages),
    [parent, messages],
  );

  return (
    <NextIntlClientProvider locale={locale} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}
