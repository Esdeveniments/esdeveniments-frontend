import { getTranslations } from "next-intl/server";
import type { JSX } from "react";
import type { NoEventsFoundProps } from "types/props";
import NoEventsFoundContent from "./NoEventsFoundContent";

const NoEventsFound = async ({
  title,
  description,
}: NoEventsFoundProps): Promise<JSX.Element> => {
  const t = await getTranslations("Components.NoEventsFound");

  return (
    <NoEventsFoundContent
      title={title}
      description={description}
      ctaLabel={t("cta")}
      helperText={t("helper")}
    />
  );
};

NoEventsFound.displayName = "NoEventsFound";

export default NoEventsFound;
