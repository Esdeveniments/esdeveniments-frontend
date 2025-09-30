import { OpeningInfo } from "types/api/restaurant";
import { FormatOpeningHoursOptions } from "types/common";

// Basic Catalan dictionary (extendable for future locales)
// Keep shape implicit to avoid declaring types outside /types (rule enforced by lint)
const dict = {
  ca: {
    open_now: "Obert ara",
    closes_at: (t: string) => `Tanca a les ${t}`,
    closed_now: "Tancat ara",
    opens_at: (t: string) => `Obre a les ${t}`,
    unknown: "Horari no disponible",
    inferred: "(probable)",
    confirmed: "(confirmat)",
  },
} as const;

export function formatOpeningHours(
  info: OpeningInfo | undefined,
  options: FormatOpeningHoursOptions = {}
): string | undefined {
  if (!info) return undefined;
  const locale = options.locale || "ca";
  const t = (dict as Record<string, typeof dict.ca>)[locale] || dict.ca;
  const now = options.now ? new Date(options.now) : new Date();
  // ensure 'now' is considered used (deterministic clock override for tests)
  void now;

  // Handle closed status
  if (info.open_status === "closed" && !info.segments?.length) {
    return "Tancat";
  }

  // Event-date mode: just list segments
  if (info.event_date) {
    if (info.segments && info.segments.length) {
      return info.segments
        .map((s) => {
          if (s.overnight) {
            return `${s.start}–${s.end} (nit)`;
          }
          return `${s.start}–${s.end}`;
        })
        .join(", ");
    }
    return t.unknown;
  }

  // Today mode relative to now
  if (info.open_status === "open" && info.segments?.length) {
    const primary = info.segments[0];
    return `${t.open_now} · ${t.closes_at(primary.end)}`;
  }
  if (info.open_status === "closed" && info.segments?.length) {
    const primary = info.segments[0];
    return `${t.closed_now} · ${t.opens_at(primary.start)}`;
  }
  if (info.segments?.length) {
    return info.segments.map((s) => `${s.start}–${s.end}`).join(", ");
  }
  return t.unknown;
}

export function formatConfidence(
  conf?: string,
  locale: string = "ca"
): string | undefined {
  if (!conf) return undefined;
  if (locale !== "ca") return conf;
  if (conf === "confirmed") return "Obert (confirmat)";
  if (conf === "inferred") return "Obert (probable)";
  if (conf === "none") return "Horari no confirmat";
  return undefined;
}
