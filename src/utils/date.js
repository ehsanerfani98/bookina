/**
 * Date Utility - Persian calendar conversions and date formatting
 */

/**
 * Convert Gregorian date to Jalali (Persian) date
 * @param {number} gy - Gregorian year
 * @param {number} gm - Gregorian month (1-12)
 * @param {number} gd - Gregorian day
 * @returns {{jy: number, jm: number, jd: number}} Jalali date object
 */
export function toJalaali(gy, gm, gd) {
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let gy2 = gy - (gm <= 2 ? 1 : 0);
  let days = 365 * gy2 + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) + gd + g_d_m[gm-1] - 79;
  let jy = 621 + 33 * Math.floor(days/12053);
  days %= 12053;
  jy += 4 * Math.floor(days/1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days-1)/365);
    days = (days-1) % 365;
  }
  let jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
  let jd = 1 + (days < 186 ? days % 31 : (days-186) % 30);
  return { jy, jm, jd };
}

/**
 * Convert Jalali (Persian) date to Gregorian date
 * @param {number} jy - Jalali year
 * @param {number} jm - Jalali month (1-12)
 * @param {number} jd - Jalali day
 * @returns {{gy: number, gm: number, gd: number}} Gregorian date object
 */
export function toGregorian(jy, jm, jd) {
  let j_day = (jy - 979) * 365 + Math.floor((jy-979)/33)*8 + Math.floor(((jy-979)%33+3)/4);
  for (let i=0;i<jm-1;i++) j_day += i<6 ? 31 : 30;
  j_day += jd - 1;
  let g_day = j_day + 79;
  let gy = 1600 + 400 * Math.floor(g_day/146097);
  g_day %= 146097;
  let leap = true;
  if (g_day >= 36525) {
    g_day--;
    gy += 100 * Math.floor(g_day/36524);
    g_day %= 36524;
    if (g_day >= 365) g_day++;
    else leap = false;
  }
  gy += 4 * Math.floor(g_day/1461);
  g_day %= 1461;
  if (g_day >= 366) {
    leap = false;
    g_day -= 366;
    gy += Math.floor(g_day/365);
    g_day %= 365;
  }
  const g_d_m = [31, (leap?29:28),31,30,31,30,31,31,30,31,30,31];
  let gm=0; while (g_day >= g_d_m[gm]) { g_day -= g_d_m[gm]; gm++; }
  let gd = g_day + 1;
  return { gy, gm: gm+1, gd };
}

/**
 * Get number of days in a Jalali month
 * @param {number} jy - Jalali year
 * @param {number} jm - Jalali month (1-12)
 */
export function getJalaaliMonthDays(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const leapCandidates = [1,5,9,13,17,22,26,30];
  return leapCandidates.includes((jy-474)%33) ? 30 : 29;
}

/**
 * Get starting day of week for a Jalali month
 * @param {number} jy
 * @param {number} jm
 */
export function getJalaaliMonthStartDay(jy, jm) {
  const { gy, gm, gd } = toGregorian(jy, jm, 1);
  const d = new Date(gy, gm-1, gd).getDay(); // 0=Sunday
  return (d + 1) % 7; // 0=Saturday
}

/**
 * Convert number/string to Persian digits
 */
export function toPersianNumber(input) {
  const digits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  return input.toString().replace(/\d/g,c=>digits[c]);
}

export const persianMonths = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
export const daysOfWeek = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];

/**
 * Format Jalali date to display
 */
export function formatJalaaliDate(jy,jm,jd) {
  return `${toPersianNumber(jd)} ${persianMonths[jm-1]} ${toPersianNumber(jy)}`;
}
