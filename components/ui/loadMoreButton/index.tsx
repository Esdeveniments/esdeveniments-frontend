import { useTransition } from "react";
import { LoadMoreButtonProps } from "types/props";
import Button from "@components/ui/common/button";
import { useTranslations } from "next-intl";

export default function LoadMoreButton({
  onLoadMore,
  hasMore = true,
  isLoading = false,
}: Pick<LoadMoreButtonProps, "onLoadMore" | "hasMore" | "isLoading">) {
  const t = useTranslations("Components.LoadMoreButton");
  const [isPending, startTransition] = useTransition();
  const handleLoadMore = () => {
    if (isLoading || isPending || !hasMore) return;
    startTransition(() => {
      void onLoadMore();
    });
  };

  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex-center w-full py-section-y">
      <Button
        variant="neutral"
        onClick={handleLoadMore}
        disabled={isLoading || isPending}
        data-testid="load-more-button"
        className="cursor-pointer disabled:cursor-not-allowed"
        aria-label={
          isLoading || isPending
            ? t("loading")
            : t("label")
        }
      >
        {isLoading || isPending ? (
          <>
            {/* Modern 3-dot spinner like Linear/Vercel */}
            <span
              className="flex items-center justify-center gap-1"
              aria-hidden="true"
            >
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
            </span>
            <span>{t("loading")}</span>
          </>
        ) : (
          t("label")
        )}
      </Button>
    </div>
  );
}
