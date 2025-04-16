import React, {
  useState,
  useRef,
  useCallback,
  Suspense,
  memo,
  useEffect,
} from "react";
import CalendarButton from "./CalendarButton";
import { generateCalendarUrls, CalendarUrls } from "@utils/calendarUtils";

const LazyCalendarList = React.lazy(() => import("./CalendarList"));

type DateString = string | Date;

interface AddToCalendarProps {
  title: string;
  description: string;
  location: string;
  startDate: DateString;
  endDate: DateString;
  canonical: string;
  hideText?: boolean;
}

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
      }),
    [title, description, location, startDate, endDate, canonical]
  );

  useOutsideClick(containerRef, () => setShowAgendaList(false));

  return (
    <div ref={containerRef} className="relative">
      <CalendarButton onClick={toggleAgendaList} hideText={hideText} />
      {showAgendaList && (
        <Suspense fallback={<div>Carregant...</div>}>
          <LazyCalendarList
            onClick={toggleAgendaList}
            getUrls={calendarUrls}
            title={title}
          />
        </Suspense>
      )}
    </div>
  );
};

AddToCalendar.displayName = "AddToCalendar";

export default memo(AddToCalendar);
