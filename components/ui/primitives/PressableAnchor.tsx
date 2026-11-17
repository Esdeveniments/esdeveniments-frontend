import { getLocale } from "next-intl/server";

import type { PressableAnchorProps } from "types/ui";
import { DEFAULT_LOCALE } from "types/i18n";
import { LocalizedPressableAnchor } from "./LocalizedPressableAnchor";

export { LocalizedPressableAnchor };

export default async function PressableAnchor(props: PressableAnchorProps) {
  const locale = (await getLocale()) || DEFAULT_LOCALE;
  return <LocalizedPressableAnchor {...props} locale={locale} />;
}
