// Format a number or string into Indonesian Rupiah format with dots, e.g. "10.000"
export function formatRupiah(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  const numStr = String(value).replace(/[^0-9]/g, '');
  if (!numStr) return '0';
  const num = parseInt(numStr, 10);
  return num.toLocaleString('id-ID');
}

// Format for input field display while typing
export function formatInputNumber(value: string): string {
  const clean = value.replace(/[^0-9]/g, '');
  if (!clean) return '';
  return parseInt(clean, 10).toLocaleString('id-ID');
}

// Parse string with dots back into plain number, e.g. "10.000" -> 10000
export function parseRupiah(value: string | number): number {
  if (typeof value === 'number') return value;
  const clean = String(value).replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

// Current date and time in Indonesian formatted string (Real-Time WIB / Asia/Jakarta)
export function getCurrentIndonesianTime(dateObj?: Date): string {
  const d = dateObj || new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const parts = new Intl.DateTimeFormat('id-ID', options).formatToParts(d);
  let weekday = '';
  let day = '';
  let month = '';
  let year = '';
  let hour = '';
  let minute = '';
  let second = '';

  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value;
    else if (part.type === 'day') day = part.value;
    else if (part.type === 'month') month = part.value;
    else if (part.type === 'year') year = part.value;
    else if (part.type === 'hour') hour = part.value;
    else if (part.type === 'minute') minute = part.value;
    else if (part.type === 'second') second = part.value;
  }
  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  return `${cap(weekday)}, ${day} ${cap(month)} ${year} ${hour}:${minute}:${second} WIB`;
}

// Format short date (from string or current date)
export function getShortDate(dateStr?: string): string {
  if (dateStr) {
    if (dateStr.includes('WIB')) {
      const parts = dateStr.split(' ');
      if (parts.length >= 4) {
        return parts.slice(1, 4).join(' ');
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return dateStr;
  }
  const now = new Date();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// Normalize citizen name: trim and collapse multiple spaces into a single space
export function normalizeCitizenName(name: string | undefined | null): string {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

// Deterministic A-Z comparator for citizen names
export function compareCitizenNames(nameA: string, nameB: string): number {
  const a = normalizeCitizenName(nameA);
  const b = normalizeCitizenName(nameB);
  const aKey = a.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  const bKey = b.toLowerCase().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return a.localeCompare(b, 'id', { sensitivity: 'base', numeric: true });
}

// Sort an array of objects with a `name` property strictly A-Z without mutating the input
export function sortCitizensAlphabetically<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => compareCitizenNames(a.name, b.name));
}

