export type ValidRangeType = "WEEKLY" | "WEEKEND";

function parseISO(dateStr: string): Date {
  // Parse as local date to avoid UTC interpretation of YYYY-MM-DD
  // Accepts strictly YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new Error(`Invalid date: ${dateStr}`);
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1; // 0-based
  const day = Number(m[3]);
  const d = new Date(year, monthIndex, day, 0, 0, 0, 0);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d;
}

function diffDaysInclusive(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function getWeekday(date: Date): number {
  // 0=Sunday ... 6=Saturday (JS default)
  return date.getDay();
}

export function isExactWeekendRange(
  startISO: string,
  endISO: string
): boolean {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end < start) return false;
  const days = diffDaysInclusive(start, end);
  // Weekend must be exactly Saturday-Sunday (2 days), or for some locales Friday evening? here strictly Sat-Sun
  const startIsSaturday = getWeekday(start) === 6;
  const endIsSunday = getWeekday(end) === 0;
  return startIsSaturday && endIsSunday && days === 2;
}

export function isExactWeekRange(
  startISO: string,
  endISO: string
): boolean {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end < start) return false;
  const days = diffDaysInclusive(start, end);
  // Monday (1) to Friday (5) inclusive → 5 days
  const startIsMonday = getWeekday(start) === 1;
  const endIsFriday = getWeekday(end) === 5;
  return startIsMonday && endIsFriday && days === 5;
}

export function getValidRangeType(
  startISO: string,
  endISO: string
): ValidRangeType | null {
  if (isExactWeekendRange(startISO, endISO)) return "WEEKEND";
  if (isExactWeekRange(startISO, endISO)) return "WEEKLY";
  return null;
}

export function assertValidNewsRange(
  startISO: string,
  endISO: string
): ValidRangeType {
  const type = getValidRangeType(startISO, endISO);
  if (!type) {
    throw new Error(
      "Invalid date range: must match exactly Saturday-Sunday or Monday-Friday inclusive"
    );
  }
  return type;
}