import { getTranslations } from "next-intl/server";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { NewsPaginationProps } from "types/props";
import { getLocaleSafely } from "@utils/i18n-seo";
import { buildNewsPageHref } from "@utils/news-helpers";

// Plain links (not "load more"), so crawlers reach every article.
export default async function NewsPagination({
  basePath,
  page,
  totalPages,
}: NewsPaginationProps) {
  if (totalPages <= 1 || page > totalPages) return null;

  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.NewsList" });

  return (
    <nav
      aria-label={t("paginationLabel")}
      className="flex-between gap-element-gap"
    >
      {page > 1 ? (
        <PressableAnchor
          href={buildNewsPageHref(basePath, page - 1)}
          className="btn-outline"
          variant="plain"
          rel="prev"
        >
          {t("prev")}
        </PressableAnchor>
      ) : (
        <span />
      )}
      <span className="body-small text-muted-foreground">
        {t("pageOf", { page, total: totalPages })}
      </span>
      {page < totalPages ? (
        <PressableAnchor
          href={buildNewsPageHref(basePath, page + 1)}
          className="btn-outline"
          variant="plain"
          rel="next"
        >
          {t("next")}
        </PressableAnchor>
      ) : (
        <span />
      )}
    </nav>
  );
}
