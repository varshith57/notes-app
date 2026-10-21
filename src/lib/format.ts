/** "1,250" for whole amounts; decimals only when the amount has them ("1,250.50"). */
export function formatMoney(cents: number): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Plain, unformatted amount for an input field: "1250" or "1250.50". */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
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

/** Local time of day as HH:MM (24h). */
export function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Today at the given HH:MM. */
export function fromHHMM(hhmm: string): Date {
  const d = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** "6:30 PM" (or "18:30", per the device locale). */
export function formatTime(hhmm: string): string {
  return fromHHMM(hhmm).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatTimestamp(iso: string): string {
  return formatDay(toISODate(new Date(iso)));
}
