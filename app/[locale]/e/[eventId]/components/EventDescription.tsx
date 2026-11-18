import Description, { DescriptionBody } from "@components/ui/common/description";
import { isNonDefaultLocale } from "@utils/i18n-routing";
import TranslateDescription from "./TranslateDescription";
import { hashText } from "../translation-utils";
import type { EventDescriptionProps } from "types/event";

export default function EventDescription({
  slug,
  description,
  introText,
  locale,
  showTranslate,
}: EventDescriptionProps) {
  // Descriptions are written in Catalan: offer a translation on es/en only.
  const targetLang = showTranslate && isNonDefaultLocale(locale) ? locale : null;

  return (
    <div className="max-w-none text-foreground min-w-0">
      {targetLang ? (
        <TranslateDescription
          slug={slug}
          targetLang={targetLang}
          version={hashText(description || "")}
          introText={introText}
        >
          <DescriptionBody description={description} />
        </TranslateDescription>
      ) : (
        <Description description={description} introText={introText} />
      )}
    </div>
  );
}
