"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { setHours, setMinutes, setSeconds, addMinutes } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import type { DatePickerComponentProps, TimeSelectorProps, DateButtonProps } from "types/props";
import "react-day-picker/style.css";

const LOCALE_MAP: Record<string, Locale> = { ca, es, en: enUS };

function toDate(dateStr: string): Date {
  if (!dateStr) return setHours(setMinutes(new Date(), 0), 9);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T09:00`);
  }
  return new Date(dateStr);
}

function toISOStringLocalMinutes(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function computeEndDate(
  startingDate: Date,
  initialEndDate: string | undefined,
  isAllDay: boolean,
): Date {
  if (isAllDay) {
    const candidate = initialEndDate ? toDate(initialEndDate) : startingDate;
    const baseDate = candidate >= startingDate ? candidate : startingDate;
    return setSeconds(setMinutes(setHours(baseDate, 23), 59), 59);
  }

  const defaultEndDate = new Date(startingDate.getTime() + 60 * 60 * 1000);
  if (!initialEndDate) {
    return defaultEndDate;
  }

  const candidate = toDate(initialEndDate);
  return candidate > startingDate ? candidate : defaultEndDate;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateDisplay(d: Date, locale: string): string {
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;
  return d.toLocaleDateString(dateFnsLocale.code ?? locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function TimeSelector({
  value,
  onChange,
  minTime,
  label,
}: TimeSelectorProps) {
  return (
    <input
      type="time"
      value={value}
      min={minTime}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="input h-12 text-base"
    />
  );
}

const DateButton = forwardRef<HTMLButtonElement, DateButtonProps>(
  ({ label, value, isOpen, onClick, error }, ref) => {
    const accessibleLabel = value ? `${label}: ${value}` : label;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={accessibleLabel}
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-4 py-3 border rounded-xl text-foreground-strong text-base bg-background hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all flex items-center justify-between gap-2 ${
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : error
              ? "border-error focus-visible:ring-error/40"
              : "border-border"
        }`}
      >
        <span>{value || label}</span>
        <CalendarIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </button>
    );
  }
);
DateButton.displayName = "DateButton";

export default function DatePickerImpl({
  idPrefix = "date",
  startDate: initialStartDate,
  endDate: initialEndDate,
  minDate,
  onChange,
  required,
  className,
  enableAllDayToggle = false,
  isAllDay = false,
  onToggleAllDay,
  autoFocus,
  error,
}: DatePickerComponentProps) {
  const t = useTranslations("Components.DatePicker");
  const locale = useLocale();
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;

  const startDate = toDate(initialStartDate);
  const endDate = computeEndDate(startDate, initialEndDate, isAllDay);
  const minDateObj = minDate ? toDate(minDate) : undefined;

  const [activeField, setActiveField] = useState<"start" | "end" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const endButtonRef = useRef<HTMLButtonElement>(null);
  const hasAutoFocusedRef = useRef(false);
  const allDaySwitchId = `${idPrefix}-all-day-switch`;

  useEffect(() => {
    if (autoFocus && startButtonRef.current && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true;
      startButtonRef.current.focus();
    }
  }, [autoFocus]);

  // Manage enter/leave animation for the calendar popup. We intentionally
  // drive the animation flag from the active field change so the popup stays
  // mounted long enough to animate out.
  useEffect(() => {
    if (activeField) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- animation state is derived from activeField changes
      setIsAnimating(true);
      return;
    }

    const timer = setTimeout(() => setIsAnimating(false), 200);
    return () => clearTimeout(timer);
  }, [activeField]);

  // Close calendar when clicking outside, pressing Escape, or moving focus out
  useEffect(() => {
    if (!activeField) return;

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        target.isConnected &&
        wrapperRef.current &&
        !wrapperRef.current.contains(target)
      ) {
        setActiveField(null);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [activeField]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && activeField) {
      event.stopPropagation();
      event.preventDefault();

      const field = activeField;
      setActiveField(null);

      // Restore focus to the button that opened the calendar
      requestAnimationFrame(() => {
        if (field === "start") {
          startButtonRef.current?.focus();
        } else if (field === "end") {
          endButtonRef.current?.focus();
        }
      });
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Only close the calendar when focus moves to a known element outside the
    // wrapper (e.g. user pressed Tab). When clicking non-focusable elements
    // inside the dropdown, relatedTarget is null and the existing mousedown
    // listener already handles outside clicks, so we leave the calendar open.
    if (
      event.relatedTarget &&
      wrapperRef.current &&
      !wrapperRef.current.contains(event.relatedTarget as Node)
    ) {
      setActiveField(null);
    }
  };

  const handleDaySelectStart = (day: Date | undefined): void => {
    if (day) {
      const newStart = new Date(day);
      newStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);

      onChange("startDate", toISOStringLocalMinutes(newStart));

      if (isAllDay) {
        const endOfDay = setSeconds(
          setMinutes(setHours(newStart, 23), 59),
          59,
        );
        onChange("endDate", toISOStringLocalMinutes(endOfDay));
        setActiveField(null);
        requestAnimationFrame(() => {
          startButtonRef.current?.focus();
        });
      } else {
        const diff = endDate.getTime() - startDate.getTime();
        const newEnd =
          diff > 0
            ? new Date(newStart.getTime() + diff)
            : addMinutes(newStart, 60);
        onChange("endDate", toISOStringLocalMinutes(newEnd));
        // Keep calendar open so user can adjust the time without re-clicking
      }
    }
  };

  const handleDaySelectEnd = (day: Date | undefined): void => {
    if (day) {
      const newEnd = new Date(day);
      newEnd.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);

      if (isAllDay) {
        const baseDate = newEnd <= startDate ? startDate : newEnd;
        const corrected = setSeconds(
          setMinutes(setHours(baseDate, 23), 59),
          59,
        );
        onChange("endDate", toISOStringLocalMinutes(corrected));
        setActiveField(null);
        requestAnimationFrame(() => {
          endButtonRef.current?.focus();
        });
      } else {
        const corrected =
          newEnd <= startDate ? addMinutes(startDate, 15) : newEnd;
        onChange("endDate", toISOStringLocalMinutes(corrected));
        // Keep calendar open so user can adjust the time without re-clicking
      }
    }
  };

  const handleStartTimeChange = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const newStart = new Date(startDate);
    newStart.setHours(h, m, 0, 0);
    onChange("startDate", toISOStringLocalMinutes(newStart));

    if (newStart >= endDate) {
      const newEnd = addMinutes(newStart, 60);
      onChange("endDate", toISOStringLocalMinutes(newEnd));
    }
  };

  const handleEndTimeChange = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const newEnd = new Date(endDate);
    newEnd.setHours(h, m, 0, 0);

    const corrected = newEnd <= startDate ? addMinutes(startDate, 15) : newEnd;
    onChange("endDate", toISOStringLocalMinutes(corrected));
  };

  const startDisplay = formatDateDisplay(startDate, locale);
  const endDisplay = formatDateDisplay(endDate, locale);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full flex flex-col gap-4 ${className ?? ""}`}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div className="flex justify-between items-center">
        <label className="form-label">{t("dateAndTime")}</label>

        {enableAllDayToggle && (
          <label
            htmlFor={allDaySwitchId}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="relative">
              <input
                id={allDaySwitchId}
                type="checkbox"
                role="switch"
                aria-checked={isAllDay}
                className="sr-only"
                checked={isAllDay}
                onChange={(e) => onToggleAllDay?.(e.target.checked)}
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${isAllDay ? "bg-primary" : "bg-muted"}`}
              />
              <div
                className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAllDay ? "transform translate-x-4" : ""}`}
              />
            </div>
            <span className="text-sm text-foreground-strong">
              {t("allDay")}
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-muted-foreground mb-1.5 block font-medium">
            {t("start")}
          </span>
          <DateButton
            ref={startButtonRef}
            label={t("start")}
            value={
              isAllDay
                ? startDisplay
                : `${startDisplay} ${formatTime(startDate)}`
            }
            isOpen={activeField === "start"}
            onClick={() =>
              setActiveField((prev) => (prev === "start" ? null : "start"))
            }
            error={error}
          />
        </div>

        <div className="w-full sm:flex-1 sm:min-w-0">
          <span className="text-sm text-muted-foreground mb-1.5 block font-medium">
            {t("end")}
          </span>
          <DateButton
            ref={endButtonRef}
            label={t("end")}
            value={
              isAllDay
                ? endDisplay
                : `${endDisplay} ${formatTime(endDate)}`
            }
            isOpen={activeField === "end"}
            onClick={() =>
              setActiveField((prev) => (prev === "end" ? null : "end"))
            }
            error={error}
          />
        </div>
      </div>

      {(activeField || isAnimating) && (
        <>
          <div
            className="fixed inset-0 bg-black/5 z-40 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className={`rdp-form-wrapper absolute top-full left-0 right-0 sm:left-0 sm:right-auto sm:w-fit z-50 mt-2 border border-border rounded-card p-3 bg-background shadow-lg transition-all duration-200 ease-smooth origin-top-left ${
              activeField
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            }`}
          >
            {activeField && (
              <>
                <DayPicker
                  id={`${idPrefix}-${activeField}`}
                  mode="single"
                  locale={dateFnsLocale}
                  selected={activeField === "start" ? startDate : endDate}
                  onSelect={
                    activeField === "start"
                      ? handleDaySelectStart
                      : handleDaySelectEnd
                  }
                  disabled={
                    activeField === "end"
                      ? {
                          before:
                            minDateObj && minDateObj > startDate
                              ? minDateObj
                              : startDate,
                        }
                      : minDateObj
                        ? { before: minDateObj }
                        : undefined
                  }
                  defaultMonth={activeField === "start" ? startDate : endDate}
                  showOutsideDays
                  fixedWeeks
                  required={required}
                />
                {!isAllDay && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <TimeSelector
                      value={formatTime(
                        activeField === "start" ? startDate : endDate,
                      )}
                      onChange={
                        activeField === "start"
                          ? handleStartTimeChange
                          : handleEndTimeChange
                      }
                      minTime={
                        activeField === "end" &&
                          startDate.toDateString() === endDate.toDateString()
                          ? formatTime(startDate)
                          : undefined
                      }
                      label={activeField === "start" ? t("start") : t("end")}
                    />
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      if (activeField === "start") {
                        handleDaySelectStart(today);
                      } else if (activeField === "end") {
                        handleDaySelectEnd(today);
                      }
                    }}
                    className="text-sm font-medium text-primary hover:text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                  >
                    {t("today")}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
