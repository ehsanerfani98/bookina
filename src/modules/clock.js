/**
 * Clock Module — big date card: Jalali weekday/day/month, Gregorian + Hijri dates,
 * Tehran time and quick weather summary (from weather module cache).
 */

import { getElement, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import {
  toJalaali,
  toPersianNumber,
  daysOfWeek,
  persianMonths,
  hijriToday,
  gregorianLabel,
  getJalaaliWeekday,
} from "../utils/date.js";

export class ClockManager {
  constructor() {
    this.timer = null;
  }

  async initialize() {
    this.renderDate();
    this.renderTime();
    this.timer = setInterval(() => this.renderTime(), 1000);
    this.renderMiniWeather();
    // weather module broadcasts fresh data
    window.addEventListener("bookina:weather", () => this.renderMiniWeather());
    console.log("Clock module initialized");
  }

  renderDate() {
    const now = new Date();
    const { jy, jm, jd } = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const weekdayIdx = getJalaaliWeekday(jy, jm, jd);

    const wd = getElement("clockWeekday");
    const day = getElement("clockDay");
    const my = getElement("clockMonthYear");
    const alt = getElement("clockAltDates");

    if (wd) wd.textContent = daysOfWeek[weekdayIdx];
    if (day) day.textContent = toPersianNumber(jd);
    if (my) my.textContent = `${persianMonths[jm - 1]} ${toPersianNumber(jy)}`;

    const hijri = hijriToday(now);
    const greg = gregorianLabel(now);
    if (alt) {
      const parts = [];
      if (greg) parts.push(greg);
      if (hijri) parts.push(`${hijri.day} ${hijri.monthName}`);
      alt.textContent = parts.join(" · ") || "—";
    }
  }

  renderTime() {
    const main = getElement("clockTimeMain");
    const sec = getElement("clockSeconds");
    if (!main) return;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Tehran",
      })
        .format(new Date())
        .split(":");
      main.textContent = toPersianNumber(`${parts[0]}:${parts[1]}`);
      if (sec) sec.textContent = toPersianNumber(parts[2]);
    } catch (e) {
      const n = new Date();
      main.textContent = toPersianNumber(
        `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`
      );
      if (sec) sec.textContent = toPersianNumber(String(n.getSeconds()).padStart(2, "0"));
    }
  }

  renderMiniWeather() {
    const box = getElement("clockWeather");
    if (!box) return;

    (async () => {
      const result = await storage.get("cachedWeather");
      const cached = result.cachedWeather;
      if (!cached?.data?.current) {
        box.hidden = true;
        return;
      }
      const { temperature_2m, weather_code } = cached.data.current;
      const { temperature_2m_max, temperature_2m_min } = cached.data.daily || {};
      const info = wmoInfo(weather_code);

      const tempEl = getElement("cwTemp");
      const descEl = getElement("cwDesc");
      if (tempEl) tempEl.textContent = `${toPersianNumber(Math.round(temperature_2m))}°`;
      if (descEl) {
        const range =
          temperature_2m_max != null
            ? `<br>${toPersianNumber(Math.round(temperature_2m_max))}° / ${toPersianNumber(Math.round(temperature_2m_min))}°`
            : "";
        descEl.innerHTML = `${info.emoji} ${info.desc}${range}`;
      }
      box.hidden = false;
    })();
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh() {
    this.renderDate();
    this.renderTime();
    this.renderMiniWeather();
  }

  async saveState() {
    return Promise.resolve();
  }
}

/** WMO weather-code → {desc, emoji} */
export function wmoInfo(code) {
  const map = {
    0: { desc: "آسمان صاف", emoji: "☀️" },
    1: { desc: "عمدتاً صاف", emoji: "🌤️" },
    2: { desc: "کمی ابری", emoji: "⛅" },
    3: { desc: "ابری", emoji: "☁️" },
    45: { desc: "مه‌آلود", emoji: "🌫️" },
    48: { desc: "مه یخ‌زده", emoji: "🌫️" },
    51: { desc: "نم‌نم باران خفیف", emoji: "🌦️" },
    53: { desc: "نم‌نم باران", emoji: "🌦️" },
    55: { desc: "نم‌نم باران شدید", emoji: "🌦️" },
    61: { desc: "باران خفیف", emoji: "🌧️" },
    63: { desc: "باران", emoji: "🌧️" },
    65: { desc: "باران شدید", emoji: "🌧️" },
    71: { desc: "بارش برف خفیف", emoji: "🌨️" },
    73: { desc: "بارش برف", emoji: "❄️" },
    75: { desc: "بارش برف سنگین", emoji: "❄️" },
    80: { desc: "رگبار پراکنده", emoji: "🌦️" },
    81: { desc: "رگبار باران", emoji: "🌧️" },
    82: { desc: "رگبار شدید", emoji: "⛈️" },
    95: { desc: "رعد و برق", emoji: "⛈️" },
    96: { desc: "رعد و برق با تگرگ", emoji: "⛈️" },
    99: { desc: "رعد و برق با تگرگ", emoji: "⛈️" },
  };
  return map[code] || { desc: "نامشخص", emoji: "🌡️" };
}
