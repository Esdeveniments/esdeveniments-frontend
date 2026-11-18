import { sanitizeHtml } from "@utils/sanitize";
import { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";
import DescriptionLayout, { DESCRIPTION_BODY_CLASS } from "./DescriptionLayout";

/** The description HTML, processed and sanitized to prevent XSS. */
export function DescriptionBody({ description }: Pick<DescriptionProps, "description">) {
  const sanitizedHtml = sanitizeHtml(processDescription(description || ""));
  return (
    <div className={DESCRIPTION_BODY_CLASS} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
}

export default async function Description({
  description,
  introText,
}: DescriptionProps): Promise<JSX.Element> {
  const t = await getTranslations("Components.Description");

  return (
    <DescriptionLayout title={t("title")} introText={introText}>
      <DescriptionBody description={description} />
    </DescriptionLayout>
  );
}
