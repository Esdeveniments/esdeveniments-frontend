import { LoadMoreButtonProps } from "types/props";
import { Text } from "@components/ui/primitives";

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
    <div className="flex w-full items-center justify-center py-component-xl">
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isButtonDisabled}
        className="flex w-[120px] items-center justify-center gap-component-xs rounded-lg border-2 border-bColor bg-whiteCorp p-component-xs font-barlow font-semibold uppercase italic tracking-wider duration-300 ease-in-out hover:border-whiteCorp hover:bg-primary hover:text-whiteCorp focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={buttonText}
      >
        {/* Loading spinner */}
        {(isLoading || isValidating) && (
          <span className="border-current border-t-transparent mr-xs inline-block h-4 w-4 animate-spin rounded-full border-2" />
        )}
        <Text as="span">{buttonText}</Text>
      </button>
    </div>
  );
}
