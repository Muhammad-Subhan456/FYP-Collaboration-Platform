/** Local calendar day key (YYYY-MM-DD) from an ISO/date value. */
export function toDayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

export function addMonths(year: number, monthIndex: number, delta: number) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

/** Monday-first grid of days covering the visible month (includes padding days). */
export function buildMonthGrid(year: number, monthIndex: number): Date[] {
  const first = startOfMonth(year, monthIndex);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

export function formatWeekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}
