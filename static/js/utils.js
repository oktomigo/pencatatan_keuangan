// utils.js — fungsi helper reusable: format angka, tanggal, kalkulasi, UUID

const MONTHS_LONG  = ['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun',
                      'Jul','Agt','Sep','Okt','Nov','Des'];

/**
 * formatRupiah(number)
 * Mengubah angka ke format mata uang Rupiah.
 * Contoh: 1234567 → "Rp 1.234.567" | -500 → "−Rp 500" | 0 → "Rp 0"
 */
export function formatRupiah(number) {
  if (number === 0) return 'Rp 0';
  const abs = Math.abs(number);
  const formatted = abs.toLocaleString('id-ID');
  return number < 0 ? `\u2212Rp\u00A0${formatted}` : `Rp\u00A0${formatted}`;
}

/**
 * formatDate(dateStr, format)
 * Memformat string ISO YYYY-MM-DD ke berbagai format tampilan.
 * format: 'long' | 'short' | 'input' | 'group'
 */
export function formatDate(dateStr, format = 'long') {
  const [year, month, day] = dateStr.split('-').map(Number);

  switch (format) {
    case 'long':
      return `${day} ${MONTHS_LONG[month - 1]} ${year}`;

    case 'short':
      return `${day} ${MONTHS_SHORT[month - 1]}`;

    case 'input':
      return dateStr;

    case 'group': {
      const todayStr = today();
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yesterdayStr = `${yy}-${mm}-${dd}`;

      if (dateStr === todayStr)     return 'Hari Ini';
      if (dateStr === yesterdayStr) return 'Kemarin';
      return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
    }

    default:
      return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
  }
}

/**
 * getMonthYear(date?)
 * Mengembalikan nama bulan dan tahun.
 * Contoh: getMonthYear() → "Oktober 2026"
 */
export function getMonthYear(date = new Date()) {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * daysFromNow(dateStr)
 * Selisih hari dari hari ini ke dateStr.
 * Positif = ke depan, 0 = hari ini, negatif = sudah lewat.
 */
export function daysFromNow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now    = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * calcPercentage(value, total)
 * Hitung persentase. Kembalikan 0 jika total = 0. Bisa > 100.
 */
export function calcPercentage(value, total) {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
}

/**
 * getBudgetStatus(percentage)
 * Tentukan status anggaran: 'safe' | 'warning' | 'danger'
 */
export function getBudgetStatus(percentage) {
  if (percentage >= 100) return 'danger';
  if (percentage >= 80)  return 'warning';
  return 'safe';
}

/**
 * generateDeviceId()
 * Buat UUID v4 unik sebagai anonymous device ID.
 */
export function generateDeviceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * today()
 * Kembalikan tanggal hari ini sebagai string YYYY-MM-DD (local time).
 */
export function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
