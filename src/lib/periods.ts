import { fromISODate, toISODate } from './format';

/** Inclusive date range, both ends YYYY-MM-DD. */
export interface DateRange {
  from: string;
  to: string;
}

export type PeriodKind = 'month' | 'quarter' | 'year' | 'custom';

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
  custom: 'Custom',
};

const MONTHS_PER: Record<Exclude<PeriodKind, 'custom'>, number> = { month: 1, quarter: 3, year: 12 };

/** The calendar month / quarter / year containing `day`. */
export function periodRange(kind: Exclude<PeriodKind, 'custom'>, day: string): DateRange {
  const d = fromISODate(day);
  const span = MONTHS_PER[kind];
  const startMonth = Math.floor(d.getMonth() / span) * span;
  return {
    from: toISODate(new Date(d.getFullYear(), startMonth, 1)),
    // Day 0 of the following month is the last day of this period.
    to: toISODate(new Date(d.getFullYear(), startMonth + span, 0)),
  };
}

/** The same kind of period, `delta` periods before (-) or after (+) the one containing `day`. */
export function shiftPeriod(kind: Exclude<PeriodKind, 'custom'>, day: string, delta: number): DateRange {
  const { from } = periodRange(kind, day);
  const d = fromISODate(from);
  return periodRange(kind, toISODate(new Date(d.getFullYear(), d.getMonth() + delta * MONTHS_PER[kind], 1)));
}

const short = (iso: string, withYear: boolean) =>
  fromISODate(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });

/** "October 2026", "Q4 2026 · Oct – Dec", "2026", or "1 Oct – 21 Oct 2026". */
export function periodLabel(kind: PeriodKind, range: DateRange): string {
  const from = fromISODate(range.from);
  const to = fromISODate(range.to);
  const monthName = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  switch (kind) {
    case 'month':
      return from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'quarter':
      return `Q${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()} · ${monthName(from)} – ${monthName(to)}`;
    case 'year':
      return String(from.getFullYear());
    case 'custom':
      if (range.from === range.to) return short(range.from, true);
      return from.getFullYear() === to.getFullYear()
        ? `${short(range.from, false)} – ${short(range.to, true)}`
        : `${short(range.from, true)} – ${short(range.to, true)}`;
  }
}
