"use client";

import type { ReactElement } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { useLocale } from "next-intl";
import { ca, es, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { CalendarDatePickerProps } from "types/props";
import "react-day-picker/style.css";

const LOCALE_MAP: Record<string, Locale> = { ca, es, en: enUS };

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string): Date | undefined {
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

export default function CalendarDatePicker({
  fromDate,
  toDate,
  onChange,
}: CalendarDatePickerProps): ReactElement {
  const locale = useLocale();
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;

  const from = parseYMD(fromDate);
  const selected: DateRange | undefined = from
    ? { from, to: parseYMD(toDate) ?? from }
    : undefined;

  const today = new Date();

  return (
    <div className="rdp-filter-wrapper">
      <DayPicker
        mode="range"
        locale={dateFnsLocale}
        selected={selected}
        onSelect={(range: DateRange | undefined) => {
          if (!range?.from) {
            onChange("", "");
            return;
          }
          const from = toYMD(range.from);
          const to = range.to ? toYMD(range.to) : from;
          onChange(from, to);
        }}
        disabled={{ before: today }}
        defaultMonth={selected?.from ?? today}
        showOutsideDays
        fixedWeeks
      />
    </div>
  );
}
