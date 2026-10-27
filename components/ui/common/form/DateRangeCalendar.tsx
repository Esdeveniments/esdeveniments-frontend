"use client";

import { useState, type ReactElement } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { useLocale, useTranslations } from "next-intl";
import { ca, es, enUS } from "react-day-picker/locale";
import type { DayPickerLocale } from "react-day-picker/locale";
import type { DateRangeCalendarProps } from "types/props";
import { nowInMadrid } from "@utils/constants";
import "react-day-picker/style.css";

// DayPicker locales extend date-fns with translated aria labels.
const LOCALE_MAP: Record<string, DayPickerLocale> = { ca, es, en: enUS };

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Reject silently-normalized invalid dates (e.g. Feb 31 → Mar 3)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return undefined;
  return date;
}

/**
 * One calendar for a date range: the first tap picks the start (and already
 * reports a one-day range), the second tap picks the end, a third tap starts
 * a new range. Shared by the filters modal and the publish form.
 */
export default function DateRangeCalendar({
  fromDate,
  toDate,
  onChange,
  minDate,
  required = false,
}: DateRangeCalendarProps): ReactElement {
  const t = useTranslations("Components.DateRangeCalendar");
  const locale = useLocale();
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;
  // The parent only stores complete ranges, so remember which start is still
  // waiting for its end. DayPicker needs `to: undefined` to finish the range
  // on the next tap instead of starting a new one. The parent may move the end
  // (an overnight event ends the next day), so record the end it answered
  // with; any other change, such as a chip, ends the wait.
  const [pending, setPending] = useState<{ from: string; to?: string } | null>(null);
  if (pending && pending.from === fromDate && pending.to === undefined) {
    setPending({ from: fromDate, to: toDate });
  }

  const from = parseYMD(fromDate);
  const isPending =
    Boolean(from) &&
    pending?.from === fromDate &&
    (pending.to === undefined || pending.to === toDate);
  const selected: DateRange | undefined = from
    ? { from, to: isPending ? undefined : (parseYMD(toDate) ?? from) }
    : undefined;
  const firstDay = parseYMD(minDate) ?? nowInMadrid();

  // `defaultMonth` only applies once: follow starts set from outside (chips).
  const [month, setMonth] = useState<Date>(from ?? firstDay);
  const [shownFrom, setShownFrom] = useState(fromDate);
  if (shownFrom !== fromDate) {
    setShownFrom(fromDate);
    if (from) setMonth(from);
  }

  const formatDay = (d: Date) =>
    d.toLocaleDateString(dateFnsLocale.code ?? locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const to = selected?.to;
  let summary = "";
  if (from && to && toYMD(to) !== toYMD(from)) {
    summary = `${formatDay(from)} – ${formatDay(to)}`;
  } else if (from) {
    summary = formatDay(from);
  }

  const clear = () => {
    setPending(null);
    onChange("", "");
  };

  return (
    <div className="rdp-calendar w-full">
      <DayPicker
        mode="range"
        resetOnSelect
        required={required}
        locale={dateFnsLocale}
        selected={selected}
        onSelect={(range: DateRange | undefined) => {
          if (!range?.from) {
            clear();
            return;
          }
          const start = toYMD(range.from);
          setPending(range.to ? null : { from: start });
          onChange(start, range.to ? toYMD(range.to) : start);
        }}
        disabled={{ before: firstDay }}
        month={month}
        onMonthChange={setMonth}
        showOutsideDays
        fixedWeeks
        footer={
          <p className="text-sm text-muted-foreground pt-2">
            {!from ? t("pickStart") : isPending ? t("pickEnd") : summary}
          </p>
        }
      />
      {from && !required && (
        <button
          type="button"
          onClick={clear}
          className="text-sm text-primary font-medium hover:text-primary/80 transition-colors"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
