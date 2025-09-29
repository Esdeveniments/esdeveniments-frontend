import type { EventTemporalStatus } from "types/event-status";

/**
 * Compute temporal status of an event given start & optional end date.
 * Adds an optional `nowOverride` for deterministic testing.
 * Rules:
 *  - past: endDate in past OR (no endDate and started >24h ago)
 *  - live: now between start and end (or after start if no end yet & within 24h)
 *  - upcoming: future start (granularity: days, hours, today)
 */
export function computeTemporalStatus(
  startDate: string,
  endDate?: string,
  nowOverride?: Date
): EventTemporalStatus {
  const now = nowOverride ? new Date(nowOverride) : new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : undefined;

  // Past
  if (
    (end && now > end) ||
    (!end && now.getTime() - start.getTime() > 24 * 60 * 60 * 1000)
  ) {
    const endedOn = end
      ? end.toISOString().split("T")[0]
      : start.toISOString().split("T")[0];
    return { state: "past", label: "Esdeveniment finalitzat", endedOn };
  }

  // Live
  if (now >= start && (!end || now <= end)) {
    if (end) {
      const diffMs = end.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0)
        return {
          state: "live",
          label: "En curs",
          endsIn: `Acaba en ${days} dies`,
        };
      if (hours > 0)
        return {
          state: "live",
          label: "En curs",
          endsIn: `Acaba en ${hours} hores`,
        };
      return { state: "live", label: "En curs", endsIn: "Acaba aviat" };
    }
    return { state: "live", label: "En curs" };
  }

  // Upcoming
  const diff = start.getTime() - now.getTime();
  const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
  const daysUntil = Math.floor(hoursUntil / 24);
  if (daysUntil > 0) {
    return {
      state: "upcoming",
      label: "Properament",
      startsIn: `Comença en ${daysUntil} dies`,
    };
  }
  if (hoursUntil > 0) {
    return {
      state: "upcoming",
      label: "Properament",
      startsIn: `Comença en ${hoursUntil} hores`,
    };
  }
  return { state: "upcoming", label: "Avui", startsIn: "Comença avui" };
}
