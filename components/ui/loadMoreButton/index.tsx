import { useTransition } from "react";
import { LoadMoreButtonProps } from "types/props";

export default function LoadMoreButton({
  onLoadMore,
  hasMore = true,
  isLoading = false,
}: LoadMoreButtonProps) {
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
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isLoading || isPending}
        data-testid="load-more-button"
        className="btn-neutral transition-interactive cursor-pointer disabled:cursor-not-allowed"
        aria-label={
          isLoading || isPending
            ? "Carregant esdeveniments"
            : "Carregar més esdeveniments"
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
            <span>Carregant...</span>
          </>
        ) : (
          "Carregar més"
        )}
      </button>
    </div>
  );
}
