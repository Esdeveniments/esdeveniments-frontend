"use client";

import React, {
  useState,
  useRef,
  useCallback,
  Suspense,
  memo,
  useEffect,
} from "react";
import CalendarButton from "./CalendarButton";
import { generateCalendarUrls } from "@utils/calendarUtils";
import { AddToCalendarProps } from "types/common";
import type { CalendarUrls } from "types/calendar";
import { useTranslations } from "next-intl";

const LazyCalendarList = React.lazy(() => import("./CalendarList"));

const useOutsideClick = <T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
): void => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler]);
};

const AddToCalendar: React.FC<AddToCalendarProps> = ({
  title,
  description,
  location,
  startDate,
  endDate,
  canonical,
  hideText = false,
}) => {
  const t = useTranslations("Utils.Calendar");
  const moreInfoText = t("moreInfoText", { url: "{url}" });
  const calendarLabels = React.useMemo(
    () => ({
      // Avoid invalid HTML tags in ICU messages by reusing plain text
      moreInfoHtml: moreInfoText,
      moreInfoText,
      dateRange: t("dateRange", { start: "{start}", end: "{end}" }),
      dateSingle: t("dateSingle", { start: "{start}" }),
    }),
    [t, moreInfoText]
  );
  const providerLabels = React.useMemo(
    () => ({
      google: t("providers.google"),
      outlook: t("providers.outlook"),
      other: t("providers.other"),
      ariaAdd: t("ariaAdd", { name: "{name}" }),
    }),
    [t]
  );

  const [showAgendaList, setShowAgendaList] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleAgendaList = useCallback((): void => {
    setShowAgendaList((prev) => !prev);
  }, []);

  const calendarUrls = useCallback(
    (): CalendarUrls =>
      generateCalendarUrls({
        title,
        description,
        location,
        startDate,
        endDate,
        canonical,
        labels: calendarLabels,
      }),
    [title, description, location, startDate, endDate, canonical, calendarLabels]
  );

  useOutsideClick(containerRef, () => setShowAgendaList(false));

  return (
    <div ref={containerRef} className="relative">
      <CalendarButton
        onClick={toggleAgendaList}
        hideText={hideText}
        open={showAgendaList}
        label={t("button")}
      />

      {showAgendaList && (
        <Suspense fallback={<div>{t("loading")}</div>}>
          <LazyCalendarList
            onClick={toggleAgendaList}
            getUrls={calendarUrls}
            title={title}
            labels={providerLabels}
          />
        </Suspense>
      )}
    </div>
  );
};

AddToCalendar.displayName = "AddToCalendar";

export default memo(AddToCalendar);
