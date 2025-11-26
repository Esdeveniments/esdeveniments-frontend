"use client";
import { JSX, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import XIcon from "@heroicons/react/solid/XIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import { usePressFeedback } from "@components/hooks/usePressFeedback";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import { FilterButtonProps } from "types/props";

const FilterButton = ({
  text,
  enabled,
  removeUrl,
  onOpenModal,
  testId,
}: FilterButtonProps): JSX.Element => {
  const router = useRouter();
  const { handlers, isPressed } = usePressFeedback();
  const { setLoading } = useFilterLoading();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    if (isPlainLeftClick(e)) {
      startNavigationFeedback();
    }
    setLoading(true);
    router.push(removeUrl);
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="flex-shrink-0 bg-background flex justify-center items-center nowrap min-w-max"
      data-testid={testId}
    >
      <div
        className={`flex justify-center items-center gap-element-gap-sm px-badge-x py-badge-y rounded-badge ease-in-out duration-300 focus:outline-none font-medium whitespace-nowrap border pressable-chip transition-interactive ${
          enabled
            ? "border-primary bg-primary/5 text-foreground-strong"
            : "border-border text-foreground-strong hover:bg-muted"
        }`}
        data-pressed={isPressed ? "true" : undefined}
        {...handlers}
      >
        <span
          onClick={onOpenModal}
          className="text-center body-small cursor-pointer"
        >
          {text}
        </span>
        {enabled ? (
          <XIcon
            className="h-4 w-4 cursor-pointer ml-1 p-0.5 hover:bg-muted rounded"
            aria-hidden="true"
            onClick={handleRemove}
            data-testid={`${testId}-remove`}
          />
        ) : (
          <ChevronDownIcon
            className="h-4 w-4 cursor-pointer"
            aria-hidden="true"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onOpenModal();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FilterButton;
