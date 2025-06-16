"use client";

import { LoadMoreButtonProps } from "types/props";

export default function LoadMoreButton({
  onLoadMore,
  isLoading = false,
  isValidating = false,
  hasMore = true,
}: LoadMoreButtonProps) {
  // Determine button state
  const isButtonDisabled = isLoading || !hasMore;
  const buttonText = isLoading ? "Carregant..." : "Carregar més";

  const handleLoadMore = () => {
    if (isButtonDisabled || !onLoadMore) return;
    onLoadMore();
  };

  if (!hasMore) {
    return null;
  }

  return (
    <div className="w-full flex justify-center items-center py-8">
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isButtonDisabled}
        className="w-[120px] bg-whiteCorp flex justify-center items-center gap-2 font-barlow italic uppercase tracking-wider font-semibold p-2 border-2 border-bColor rounded-lg hover:bg-primary hover:text-whiteCorp hover:border-whiteCorp ease-in-out duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={buttonText}
      >
        {/* Loading spinner */}
        {(isLoading || isValidating) && (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        )}
        {buttonText}
      </button>
    </div>
  );
}
