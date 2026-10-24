/**
 * Date Utility - Persian/Jalali/Gregorian/Hijri conversions and formatting
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert number/string to Persian digits */
export function toPersianNumber(input) {
  return String(input).replace(/\d/g, (c) => PERSIAN_DIGITS[c]);
}

/** Format a number with Persian digits + thousands separator (٬) */
export function toPersianPrice(input) {
  const num = Number(String(input).replace(/[^\d.-]/g, ""));
  if (isNaN(num)) return toPersianNumber(input);
  return toPersianNumber(Math.round(num).toLocaleString("en-US").replace(/,/g, "٬"));
}

/**
 * Convert Gregorian date to Jalali (Persian) date
 * Classic 33-year cycle algorithm (battle-tested, matches jdf.scr.ir)
 * @returns {{jy: number, jm: number, jd: number}}
 */
export function toJalaali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  // NOTE: truncation (not floor) is intentional here — matters when days === 0
  // at the start of a 1461-day block (leap-year boundary, e.g. 1403/1/1)
  jy += Math.trunc((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/**
 * Convert Jalali (Persian) date to Gregorian date
 * @returns {{gy: number, gm: number, gd: number}}
 */
export function toGregorian(jy, jm, jd) {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days--;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1; // day-of-year (1-based)
  const isLeapGy = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthLens = [31, isLeapGy ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && gd > monthLens[gm]) {
    gd -= monthLens[gm];
    gm++;
  }
  return { gy, gm: gm + 1, gd };
}

/**
 * Number of days in a Jalali month (33-year cycle leap rule)
 */
export function getJalaaliMonthDays(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: leap if (jy % 33) is one of the leap remainders
  const leapRemainders = [1, 5, 9, 13, 17, 22, 26, 30];
  return leapRemainders.includes(((jy % 33) + 33) % 33) ? 30 : 29;
}

/**
 * Weekday index (0 = Saturday … 6 = Friday) for a Jalali date
 */
export function getJalaaliWeekday(jy, jm, jd) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  const d = new Date(gy, gm - 1, gd).getDay(); // 0 = Sunday
  return (d + 1) % 7;
}

/**
 * Jalali date of today
 */
export function todayJalaali() {
  const n = new Date();
  return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/**
 * Hijri (Islamic) date via Intl — returns {day, monthName, year} in Persian
 */
export function hijriToday(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat("fa-IR-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = fmt.formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t)?.value || "";
    return {
      day: get("day"),
      monthName: get("month"),
      year: get("year"),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Gregorian "24 October" style label in Persian
 * NOTE: fa-IR defaults to the Persian calendar — must force -u-ca-gregory
 */
export function gregorianLabel(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
      day: "numeric",
      month: "long",
    }).format(date);
  } catch (e) {
    return "";
  }
}

export const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export const daysOfWeek = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه",
];

/** Short weekday names for calendar header */
export const daysOfWeekShort = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** Format Jalali date to display: ۲ آبان ۱۴۰۵ */
export function formatJalaaliDate(jy, jm, jd) {
  return `${toPersianNumber(jd)} ${persianMonths[jm - 1]} ${toPersianNumber(jy)}`;
}

/**
 * Relative time in Persian ("۵ دقیقه پیش")
 */
export function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "همین حالا";
  if (diff < 3600) return `${toPersianNumber(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${toPersianNumber(Math.floor(diff / 3600))} ساعت پیش`;
  return `${toPersianNumber(Math.floor(diff / 86400))} روز پیش`;
}
