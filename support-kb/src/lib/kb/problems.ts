// What #4471 actually holds, read from the reports themselves. Same rules as the desk's causes.ts,
// plus one thing causes.ts never looks at: what the report says happened to the date.
import reports from '#lib/data/reports-4471.json';
import notes from '#lib/data/desk-notes.json';
import { causeOf, groupByCause, readAs, uniqueById, type Report } from '#lib/kb/causes';
import { tenantOf } from '#lib/kb/locales';

export type Problem = 'parser' | 'hint' | 'one-day';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DATE = new RegExp(`(\\d{1,2}) (${MONTHS.join('|')})`, 'g');
// Reports that describe a date one day off without two full dates.
const ONE_DAY_WORDS = new RegExp(`one day off|before I made the booking|got Tuesday.*got Monday|showed as (${WEEKDAYS.join('|')})\\.`);

const dayOfYear = (d: number, m: number) => Date.UTC(2026, m, d) / 86_400_000;

// Did the date move by exactly one day?
export function movedOneDay(body: string): boolean {
  const dates = [...body.matchAll(DATE)].map((x) => ({ d: Number(x[1]), m: MONTHS.indexOf(x[2]) }));
  if (dates.length === 2) return Math.abs(dayOfYear(dates[0].d, dates[0].m) - dayOfYear(dates[1].d, dates[1].m)) === 1;
  return ONE_DAY_WORDS.test(body);
}

export function problemOf(r: Report): Problem | null {
  if (movedOneDay(r.body)) return 'one-day';
  const cause = causeOf(r, tenantOf(r));
  return cause === 'hint' ? 'hint' : cause === 'parser' ? 'parser' : null;
}

// The export repeats rows across pages: one id, one report.
export const all: Report[] = uniqueById(reports as Report[]);

export function inTicket(ticket: number): Report[] {
  return all.filter((r) => r.mergedInto === ticket);
}

// Counted the desk's way, from its own view of the export: causes.ts groups each report by tenant
// (one-day moves stay filed under `parser`), and the one-day moves are the desk's readAs footnote
// over desk-notes.json. So the three counts overlap; `unique` is the number of reports.
export function countBy(ticket: number): Record<Problem | 'unique' | 'unplaced', number> {
  const groups = groupByCause(inTicket(ticket), tenantOf);
  const size = (c: string) => groups.find((g) => g.cause === c)?.reports.length ?? 0;
  return {
    parser: size('parser'),
    hint: size('hint'),
    'one-day': groups.reduce((n, g) => n + readAs(g, notes.oneDayMove), 0),
    unique: inTicket(ticket).length,
    unplaced: size('unplaced'),
  };
}

// Reports that are both a one-day move and filed under `parser` by the desk.
export function oneDayInParser(ticket: number): number {
  const g = groupByCause(inTicket(ticket), tenantOf).find((x) => x.cause === 'parser');
  return g ? readAs(g, notes.oneDayMove) : 0;
}

const WEEK = 7 * 86_400_000;

// Facts about what the current incident page shows, each computed from the same data.
export function facts(ticket: number, from = '2026-03-30') {
  const rs = inTicket(ticket);
  const mergedDays = new Map<string, number>();
  for (const r of rs) if (r.mergedAt) mergedDays.set(r.mergedAt.slice(0, 10), (mergedDays.get(r.mergedAt.slice(0, 10)) ?? 0) + 1);
  const [bulkDay, bulkCount] = [...mergedDays.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  const firstMerge = [...mergedDays.keys()].sort()[0];
  return {
    rows: (reports as Report[]).length,
    reports: rs.length,
    duplicateRows: (reports as Report[]).length - all.length,
    // one-day moves the desk's table counts under `parser`
    hiddenInParser: oneDayInParser(ticket),
    // reports whose intake tag disagrees with the cause the desk's own logic gives them
    intakeWrong: rs.filter((r) => {
      const c = causeOf(r, tenantOf(r));
      return c !== null && r.meta.intakeTag !== c;
    }).length,
    weeksBeforeFirstMerge: firstMerge ? Math.floor((Date.parse(firstMerge) - Date.parse(from)) / WEEK) : 0,
    bulkDay,
    bulkCount,
  };
}
