const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : undefined;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['week', 604_800_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "3 days ago" style text for an ISO timestamp, relative to `now`. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      return rtf?.format(Math.round(diff / ms), unit) ?? new Date(iso).toDateString();
    }
  }
  return iso;
}

/** Replaces the build-time text of every <time data-rel> with a live relative time. */
export function hydrateRelativeTimes(root: ParentNode = document): void {
  root.querySelectorAll<HTMLTimeElement>('time[data-rel]').forEach((el) => {
    const iso = el.dateTime;
    if (!iso) return;
    el.title ||= new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    el.textContent = relativeTime(iso);
  });
}
