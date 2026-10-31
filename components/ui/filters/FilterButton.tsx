"use client";
import { JSX, MouseEvent, startTransition } from "react";
import { useRouter } from "../../../i18n/routing";
import { XMarkIcon as XIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { usePressFeedback } from "@components/hooks/usePressFeedback";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import { FilterButtonProps } from "types/props";
import { sendGoogleEvent } from "@utils/analytics";
import { scheduleIdleCallback } from "@utils/browser";
import { useTranslations } from "next-intl";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const FilterButton = ({
  filterKey,
  text,
  enabled,
  removeUrl,
  onOpenModal,
  testId,
}: FilterButtonProps): JSX.Element => {
  const t = useTranslations("Components.Filters");
  const router = useRouter();
  const { handlers, isPressed } = usePressFeedback();
  const { setLoading } = useFilterLoading();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();

    // Defer GA dispatch to idle time — removes 1-5ms from INP critical path
    scheduleIdleCallback(() =>
      sendGoogleEvent("filter_remove", {
        context: "filters_bar",
        filter_key: filterKey,
        enabled,
      })
    );

    if (isPlainLeftClick(e)) {
      startNavigationFeedback();
    }
    startTransition(() => setLoading(true));
    router.push(removeUrl);
    // Scroll to top on whichever element scrolls: <body> when html/body
    // clip overflow (styles/globals.css), the window otherwise.
    document.body.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChipClick = () => {
    // Defer GA dispatch to idle time — removes 1-5ms from INP critical path
    scheduleIdleCallback(() =>
      sendGoogleEvent("filter_chip_click", {
        context: "filters_bar",
        filter_key: filterKey,
        enabled,
      })
    );
    onOpenModal();
  };

  return (
    <div
      className="flex-shrink-0 bg-background flex justify-center items-center nowrap min-w-max"
      data-testid={testId}
    >
      <div
        className={`flex justify-center items-center rounded-badge ease-in-out duration-300 font-medium whitespace-nowrap border pressable-chip transition-interactive ${enabled
          ? "border-primary bg-primary/5 text-foreground-strong"
          : "border-border text-foreground-strong hover:bg-muted"
          }`}
        data-pressed={isPressed ? "true" : undefined}
      >
        <button
          type="button"
          className={`flex items-center py-badge-y pl-badge-x rounded-badge cursor-pointer ${FOCUS_RING} ${enabled ? "pr-1" : "pr-badge-x gap-element-gap-sm"}`}
          onClick={handleChipClick}
          {...handlers}
        >
          <span className="text-center body-small">
            {text}
          </span>
          {!enabled && (
            <ChevronDownIcon
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </button>
        {enabled && (
          <button
            type="button"
            className={`flex items-center py-badge-y pl-element-gap-sm pr-badge-x rounded-badge cursor-pointer ${FOCUS_RING}`}
            onClick={handleRemove}
            aria-label={t("removeFilter", { filter: text })}
            data-testid={`${testId}-remove`}
          >
            <XIcon
              className="h-4 w-4 p-0.5 hover:bg-muted rounded"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterButton;
