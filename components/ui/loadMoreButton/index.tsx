import { LoadMoreButtonProps } from "types/props";

export default function LoadMoreButton({
  onLoadMore,
  isLoading = false,
  isValidating = false,
  hasMore = true,
}: LoadMoreButtonProps) {
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
        className="btn-neutral font-barlow italic uppercase tracking-wider w-[120px]"
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
