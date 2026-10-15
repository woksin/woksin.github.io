// Folds the contribution calendar from the GitHub snapshot into what the heatmap shows.
import type { Week } from './github';

export type Day = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; week: number; weekday: number };

const DAY_MS = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function foldCalendar(weeks: Week[]) {
  const days: Day[] = [];
  weeks.forEach((w, wi) => {
    const start = Date.parse(`${w.start}T00:00:00Z`);
    const offset = new Date(start).getUTCDay();
    w.counts.forEach((count, i) =>
      days.push({ date: iso(start + i * DAY_MS), count, level: 0, week: wi, weekday: (offset + i) % 7 }),
    );
  });

  // Intensity levels from quartiles of active days, so one huge day does not wash out the rest.
  const active = days.map((d) => d.count).filter((n) => n > 0).sort((a, b) => a - b);
  const q = (p: number) => active[Math.min(active.length - 1, Math.floor(active.length * p))] ?? 1;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  for (const d of days) d.level = d.count === 0 ? 0 : d.count <= q1 ? 1 : d.count <= q2 ? 2 : d.count <= q3 ? 3 : 4;

  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // Current streak: today may not have contributions yet, so it does not break the streak.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]!;
    if (d.count > 0) current++;
    else if (i !== days.length - 1) break;
  }
  const busiest = days.reduce((best, d) => (d.count > best.count ? d : best), days[0] ?? { date: '', count: 0 } as Day);

  const months = new Map<string, number>();
  for (const d of days) months.set(d.date.slice(0, 7), (months.get(d.date.slice(0, 7)) ?? 0) + d.count);

  return {
    days,
    weekCount: weeks.length,
    activeDays: active.length,
    longest,
    current,
    busiest,
    months: [...months.entries()].map(([month, total]) => ({ month, total })),
    first: days[0]?.date ?? '',
    last: days[days.length - 1]?.date ?? '',
  };
}

export const formatDay = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const formatMonthLong = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
