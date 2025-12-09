import { OpeningInfo } from "types/api/restaurant";
import { FormatOpeningHoursOptions, OpeningHoursLabels } from "types/common";
import caMessages from "../messages/ca.json";

const defaultOpeningHoursLabels: OpeningHoursLabels = (caMessages as any).Utils
  .OpeningHours as OpeningHoursLabels;

export function formatOpeningHours(
  info: OpeningInfo | undefined,
  options: FormatOpeningHoursOptions = {},
  labels: OpeningHoursLabels = defaultOpeningHoursLabels
): string | undefined {
  if (!info) return undefined;
  const locale = options.locale || "ca";
  const t = labels;
  const now = options.now ? new Date(options.now) : new Date();
  // ensure 'now' is considered used (deterministic clock override for tests)
  void now;
  void locale;

  // Handle closed status
  if (info.open_status === "closed" && !info.segments?.length) {
    return t.closed;
  }

  // Event-date mode: just list segments
  if (info.event_date) {
    if (info.segments && info.segments.length) {
      return info.segments
        .map((s) => {
          if (s.overnight) {
            return `${s.start}–${s.end} ${t.overnight}`;
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
    return `${t.openNow} · ${t.closesAt.replace("{time}", primary.end)}`;
  }
  if (info.open_status === "closed" && info.segments?.length) {
    const primary = info.segments[0];
    return `${t.closedNow} · ${t.opensAt.replace("{time}", primary.start)}`;
  }
  if (info.segments?.length) {
    return info.segments.map((s) => `${s.start}–${s.end}`).join(", ");
  }
  return t.unknown;
}

export function formatConfidence(
  conf?: string,
  _locale: string = "ca",
  labels: OpeningHoursLabels = defaultOpeningHoursLabels
): string | undefined {
  if (!conf) return undefined;
  if (conf === "confirmed") return labels.openConfirmed;
  if (conf === "inferred") return labels.openProbable;
  if (conf === "none") return labels.unconfirmed;
  return undefined;
}
