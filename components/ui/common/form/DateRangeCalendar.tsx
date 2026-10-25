"use client";

import { useState, type ReactElement } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { useLocale, useTranslations } from "next-intl";
import { ca, es, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { DateRangeCalendarProps } from "types/props";
import { nowInMadrid } from "@utils/constants";
import "react-day-picker/style.css";

const LOCALE_MAP: Record<string, Locale> = { ca, es, en: enUS };

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
  // on the next tap instead of starting a new one.
  const [pendingFrom, setPendingFrom] = useState("");

  const from = parseYMD(fromDate);
  const isPending = Boolean(from) && pendingFrom === fromDate && toDate === fromDate;
  const selected: DateRange | undefined = from
    ? { from, to: isPending ? undefined : (parseYMD(toDate) ?? from) }
    : undefined;
  const firstDay = parseYMD(minDate) ?? nowInMadrid();

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
    setPendingFrom("");
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
          setPendingFrom(range.to ? "" : start);
          onChange(start, range.to ? toYMD(range.to) : start);
        }}
        disabled={{ before: firstDay }}
        defaultMonth={selected?.from ?? firstDay}
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
