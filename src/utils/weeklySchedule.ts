import type { CommitteeSettings, DonasiSukarela } from '../types';

export interface WeekScheduleItem {
  week: number;
  startIso: string;
  endIso: string;
  startDayLabel: string;
  rangeLabel: string;
  shortRangeLabel: string;
  status: 'past' | 'current' | 'upcoming';
  statusLabel: string;
  isLocked: boolean;
}

export interface WeeklyScheduleInfo {
  activeWeek: number;
  autoRotateWeekly: boolean;
  week1StartDate: string;
  todayIso: string;
  todayFullLabel: string;
  currentWeekRangeLabel: string;
  nextRotationDateIso: string;
  nextRotationDateLabel: string;
  daysUntilNextWeek: number;
  weeks: WeekScheduleItem[];
}

const MONTHS_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTHS_FULL_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS_FULL_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

// Minggu ke-1: Minggu, 04 Oktober 2026 s/d Sabtu, 10 Oktober 2026
// Minggu ke-2: Mulai Tanggal 11 Oktober 2026 (11 Okt - 17 Okt 2026)
// Minggu ke-3: Mulai Tanggal 18 Oktober 2026 (18 Okt - 24 Okt 2026), dst. otomatis sesuai tanggal real-time
export const DEFAULT_WEEK1_START_DATE = '2026-10-04';

export function getJakartaDateIso(dateObj?: Date): string {
  const d = dateObj || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  let y = '2026';
  let m = '10';
  let day = '10';
  for (const p of parts) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') day = p.value;
  }
  return `${y}-${m}-${day}`;
}

export function parseIsoToUtcMs(isoDate: string): number {
  const clean = String(isoDate || '').trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) {
    return Date.UTC(2026, 9, 4);
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  return Date.UTC(year, month, day);
}

export function formatUtcMsToIso(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const ms = parseIsoToUtcMs(isoDate) + days * 86400000;
  return formatUtcMsToIso(ms);
}

export function formatIsoStartDayShort(startIso: string): string {
  const s = new Date(parseIsoToUtcMs(startIso));
  const sDay = String(s.getUTCDate()).padStart(2, '0');
  const sMonth = MONTHS_SHORT_ID[s.getUTCMonth()] || '';
  return `Tgl ${sDay} ${sMonth}`;
}

export function formatIsoDateRange(startIso: string, endIso: string): string {
  const s = new Date(parseIsoToUtcMs(startIso));
  const e = new Date(parseIsoToUtcMs(endIso));
  const sDay = String(s.getUTCDate()).padStart(2, '0');
  const eDay = String(e.getUTCDate()).padStart(2, '0');
  const sMonth = MONTHS_SHORT_ID[s.getUTCMonth()] || '';
  const eMonth = MONTHS_SHORT_ID[e.getUTCMonth()] || '';
  const sYear = s.getUTCFullYear();
  const eYear = e.getUTCFullYear();

  if (sYear !== eYear) {
    return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  }
  if (sMonth === eMonth) {
    return `${sDay} – ${eDay} ${eMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYear}`;
}

export function formatIsoDateShortRange(startIso: string, endIso: string): string {
  const s = new Date(parseIsoToUtcMs(startIso));
  const e = new Date(parseIsoToUtcMs(endIso));
  const sDay = String(s.getUTCDate()).padStart(2, '0');
  const eDay = String(e.getUTCDate()).padStart(2, '0');
  const sMonth = MONTHS_SHORT_ID[s.getUTCMonth()] || '';
  const eMonth = MONTHS_SHORT_ID[e.getUTCMonth()] || '';

  if (sMonth === eMonth) {
    return `${sDay}–${eDay} ${sMonth}`;
  }
  return `${sDay} ${sMonth}–${eDay} ${eMonth}`;
}

export function formatIsoDateFullId(isoDate: string): string {
  const d = new Date(parseIsoToUtcMs(isoDate));
  const dayName = DAYS_FULL_ID[d.getUTCDay()] || '';
  const dayNum = String(d.getUTCDate()).padStart(2, '0');
  const monthName = MONTHS_FULL_ID[d.getUTCMonth()] || '';
  const yearNum = d.getUTCFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${yearNum}`;
}

export function computeWeek1StartDateForTargetWeek(
  targetWeek: number,
  currentWeek1StartDate?: string,
  todayIso?: string
): string {
  const clampedWeek = Math.min(12, Math.max(1, Math.round(targetWeek || 1)));
  const today = todayIso || getJakartaDateIso();
  const todayMs = parseIsoToUtcMs(today);

  if (currentWeek1StartDate && /^\d{4}-\d{2}-\d{2}$/.test(currentWeek1StartDate.trim())) {
    const startMs = parseIsoToUtcMs(currentWeek1StartDate);
    const diffDays = Math.floor((todayMs - startMs) / 86400000);
    const dayOffsetInCycle = ((diffDays % 7) + 7) % 7;
    const currentCycleStartMs = todayMs - dayOffsetInCycle * 86400000;
    const newWeek1StartMs = currentCycleStartMs - (clampedWeek - 1) * 7 * 86400000;
    return formatUtcMsToIso(newWeek1StartMs);
  }

  const newWeek1StartMs = todayMs - (clampedWeek - 1) * 7 * 86400000;
  return formatUtcMsToIso(newWeek1StartMs);
}

export function getWeeklyScheduleInfo(
  settings?: Partial<CommitteeSettings>,
  nowDate?: Date
): WeeklyScheduleInfo {
  const todayIso = getJakartaDateIso(nowDate);
  const todayMs = parseIsoToUtcMs(todayIso);

  // Gunakan DEFAULT_WEEK1_START_DATE ('2026-10-04') agar Minggu ke-2 mulai tgl 11 Okt 2026.
  // Jika masih menggunakan tanggal lama '2026-10-03', otomatis sesuaikan ke '2026-10-04'.
  const rawStart = settings?.week1StartDate ? settings.week1StartDate.trim() : '';
  const week1StartDate =
    rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) && rawStart !== '2026-10-03'
      ? rawStart
      : DEFAULT_WEEK1_START_DATE;

  const week1StartMs = parseIsoToUtcMs(week1StartDate);
  const diffDays = Math.floor((todayMs - week1StartMs) / 86400000);

  // Pergantian minggu selalu berubah otomatis sesuai tanggal real-time (Asia/Jakarta)
  const computedAutoWeek = Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1));
  const autoRotateWeekly = true;
  const activeWeek = computedAutoWeek;

  const weeks: WeekScheduleItem[] = [];
  for (let w = 1; w <= 12; w++) {
    const wStartIso = addDaysIso(week1StartDate, (w - 1) * 7);
    const wEndIso = addDaysIso(week1StartDate, w * 7 - 1);
    const startDayLabel = formatIsoStartDayShort(wStartIso);
    const status: 'past' | 'current' | 'upcoming' =
      w < activeWeek ? 'past' : w === activeWeek ? 'current' : 'upcoming';
    const isLocked = status === 'past';
    const statusLabel =
      status === 'current'
        ? 'Minggu Ini (Aktif)'
        : status === 'past'
        ? 'Sudah Terlewat (Terkunci)'
        : `Mulai ${startDayLabel}`;

    weeks.push({
      week: w,
      startIso: wStartIso,
      endIso: wEndIso,
      startDayLabel,
      rangeLabel: formatIsoDateRange(wStartIso, wEndIso),
      shortRangeLabel: formatIsoDateShortRange(wStartIso, wEndIso),
      status,
      statusLabel,
      isLocked
    });
  }

  const activeWeekObj = weeks[activeWeek - 1] || weeks[0];
  const nextWeekStartIso = addDaysIso(activeWeekObj.startIso, 7);
  const nextWeekStartMs = parseIsoToUtcMs(nextWeekStartIso);
  const rawDaysUntilNext = Math.ceil((nextWeekStartMs - todayMs) / 86400000);
  const daysUntilNextWeek = Math.max(1, Math.min(7, rawDaysUntilNext > 0 ? rawDaysUntilNext : 7));

  return {
    activeWeek,
    autoRotateWeekly,
    week1StartDate,
    todayIso,
    todayFullLabel: formatIsoDateFullId(todayIso),
    currentWeekRangeLabel: activeWeekObj.rangeLabel,
    nextRotationDateIso: nextWeekStartIso,
    nextRotationDateLabel: formatIsoDateFullId(nextWeekStartIso),
    daysUntilNextWeek,
    weeks
  };
}

export function resolveSukarelaWeek(
  item: DonasiSukarela,
  settings?: Partial<CommitteeSettings>
): number {
  if (item.week && item.week >= 1 && item.week <= 12) {
    return item.week;
  }
  const rawStart = settings?.week1StartDate ? settings.week1StartDate.trim() : '';
  const week1StartDate =
    rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) && rawStart !== '2026-10-03'
      ? rawStart
      : DEFAULT_WEEK1_START_DATE;

  if (item.dateIso) {
    const itemIso = item.dateIso.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(itemIso)) {
      const diffDays = Math.floor((parseIsoToUtcMs(itemIso) - parseIsoToUtcMs(week1StartDate)) / 86400000);
      return Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1));
    }
  }
  return 1;
}
