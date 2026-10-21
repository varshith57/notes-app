export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parses user input like "1,234.5" into integer cents. Returns null when invalid or zero. */
export function parseMoneyToCents(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** YYYY-MM for the month containing `iso`, shifted by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function formatMonth(month: string): string {
  return fromISODate(`${month}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "Today", "Yesterday", "Tomorrow" or e.g. "13 Jan 2027". */
export function formatDay(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  const date = fromISODate(iso);
  const t = fromISODate(today);
  const diff = Math.round((date.getTime() - t.getTime()) / 86_400_000);
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimestamp(iso: string): string {
  return formatDay(toISODate(new Date(iso)));
}
