/**
 * Thousands separators for a whole number written as digits: "125000" → "1,25,000" or
 * "125,000", following the phone's region. Falls back to groups of three when the
 * platform's number formatting isn't available or uses a different separator.
 */
function groupDigits(int: string): string {
  const digits = int.replace(/^0+(?=\d)/, '');
  let local = '';
  try {
    local = Number(digits).toLocaleString(undefined, { maximumFractionDigits: 0, useGrouping: true });
  } catch {}
  if (/^\d{1,3}(,\d{2,3})*$/.test(local) && local.replace(/,/g, '') === digits) return local;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "1,250" for whole amounts; decimals only when the amount has them ("1,250.50"). */
export function formatMoney(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = groupDigits(String(Math.floor(abs / 100)));
  const fraction = abs % 100;
  return `${cents < 0 ? '-' : ''}${whole}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`;
}

/** Amount for an input field, with separators: "1,250" or "1,250.50". */
export function centsToInput(cents: number): string {
  return formatMoney(cents);
}

/**
 * Tidies an amount as it's typed: keeps digits and one decimal point (two places at most)
 * and adds thousands separators, so "125000" shows as "1,25,000" / "125,000".
 */
export function formatAmountInput(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!cleaned) return '';
  const [int, ...rest] = cleaned.split('.');
  const grouped = int ? groupDigits(int) : '0';
  return rest.length ? `${grouped}.${rest.join('').slice(0, 2)}` : grouped;
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
