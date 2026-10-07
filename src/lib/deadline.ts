import type { ArchiveReason, DeadlineInfo, ReturnItem } from './types';
import { formatNumber } from './utils';

export { formatNumber };

const MS_PER_DAY = 86_400_000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Ymd = { y: number; m: number; d: number };

function parseYmd(ymd: string): Ymd {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtYmd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

/** 'YYYY-MM-DD' → 1970-01-01 기준 일수 (UTC 자정 기준이라 로컬 시간대 영향 없음) */
function toEpochDay({ y, m, d }: Ymd): number {
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromEpochDay(day: number): string {
  const dt = new Date(day * MS_PER_DAY);
  return fmtYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function daysInMonth(y: number, m: number): number {
  return Math.round((Date.UTC(y, m, 1) - Date.UTC(y, m - 1, 1)) / MS_PER_DAY);
}

export function addDays(ymd: string, n: number): string {
  return fromEpochDay(toEpochDay(parseYmd(ymd)) + n);
}

export function addMonthsClamped(ymd: string, n: number): string {
  const { y, m, d } = parseYmd(ymd);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  return fmtYmd(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** b - a (일). b가 더 늦으면 양수 */
export function diffDays(a: string, b: string): number {
  return toEpochDay(parseYmd(b)) - toEpochDay(parseYmd(a));
}

/** 로컬 달력 기준 오늘 */
export function todayYmd(): string {
  const now = new Date();
  return fmtYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function deadlineFrom(
  base: string,
  rule: ReturnItem['rule'],
  storePolicyDays?: number,
): string {
  switch (rule) {
    case 'change_of_mind_7d':
      return addDays(base, 7);
    case 'mismatch_3m':
      return addMonthsClamped(base, 3);
    case 'store_policy_days':
      return addDays(base, storePolicyDays ?? 0);
  }
}

export function computeDeadline(
  src: Pick<ReturnItem, 'receivedDate' | 'useStartDate' | 'rule' | 'storePolicyDays'>,
  today: string,
): DeadlineInfo {
  const deadline = deadlineFrom(src.receivedDate, src.rule, src.storePolicyDays);
  const dDay = diffDays(today, deadline);
  const info: DeadlineInfo = {
    deadline,
    dDay,
    isToday: dDay === 0,
    isExpired: dDay < 0,
  };
  if (src.useStartDate && src.useStartDate !== src.receivedDate) {
    const alt = deadlineFrom(src.useStartDate, src.rule, src.storePolicyDays);
    info.useStartBasedDeadline = alt;
    info.daysEarlier = diffDays(deadline, alt);
  }
  return info;
}

export function ddayLabel(d: number): string {
  if (d === 0) return 'D-DAY';
  return d > 0 ? `D-${formatNumber(d)}` : `D+${formatNumber(-d)}`;
}

function infoOf(item: ReturnItem, today: string): DeadlineInfo {
  return computeDeadline(item, today);
}

export function sortActive(items: ReturnItem[], today: string): ReturnItem[] {
  return items
    .filter((it) => it.status === 'active')
    .map((item) => ({ item, dDay: infoOf(item, today).dDay }))
    .filter((x) => x.dDay >= 0)
    .sort((a, b) =>
      a.dDay !== b.dDay
        ? a.dDay - b.dDay
        : a.item.createdAt < b.item.createdAt
          ? -1
          : a.item.createdAt > b.item.createdAt
            ? 1
            : 0,
    )
    .map((x) => x.item);
}

export function sortArchive(items: ReturnItem[], today: string): ReturnItem[] {
  return items
    .filter((it) => it.status !== 'active' || infoOf(it, today).isExpired)
    .map((item) => ({ item, deadline: infoOf(item, today).deadline }))
    .sort((a, b) => (a.deadline < b.deadline ? 1 : a.deadline > b.deadline ? -1 : 0))
    .map((x) => x.item);
}

export function archiveReason(item: ReturnItem, today: string): ArchiveReason | null {
  if (item.status === 'returned') return 'returned';
  if (item.status === 'kept') return 'kept';
  return infoOf(item, today).isExpired ? 'expired' : null;
}

export function summarizeActive(
  items: ReturnItem[],
  today: string,
): {
  todayCount: number;
  within3Count: number;
  nearest?: { item: ReturnItem; dDay: number };
} {
  const sorted = sortActive(items, today);
  let todayCount = 0;
  let within3Count = 0;
  let nearest: { item: ReturnItem; dDay: number } | undefined;
  for (const item of sorted) {
    const dDay = infoOf(item, today).dDay;
    if (!nearest) nearest = { item, dDay };
    if (dDay === 0) todayCount += 1;
    else if (dDay <= 3) within3Count += 1;
  }
  return { todayCount, within3Count, nearest };
}

export function formatKoreanDate(ymd: string, today?: string): string {
  const p = parseYmd(ymd);
  const epoch = toEpochDay(p);
  // 1970-01-01은 목요일(4)
  const weekday = WEEKDAYS[(((epoch + 4) % 7) + 7) % 7];
  const thisYear = parseYmd(today ?? todayYmd()).y;
  const prefix = p.y === thisYear ? '' : `${p.y}년 `;
  return `${prefix}${p.m}월 ${p.d}일 (${weekday})`;
}
