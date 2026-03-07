"use client";

import { useMemo } from "react";
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
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarDatePicker({
  fromDate,
  toDate,
  onChange,
}: CalendarDatePickerProps) {
  const locale = useLocale();
  const dateFnsLocale = LOCALE_MAP[locale] ?? ca;

  const selected = useMemo((): DateRange | undefined => {
    const from = parseYMD(fromDate);
    if (!from) return undefined;
    const to = parseYMD(toDate);
    return { from, to: to ?? from };
  }, [fromDate, toDate]);

  const today = useMemo(() => new Date(), []);

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
