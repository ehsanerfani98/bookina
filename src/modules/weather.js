/**
 * Weather Module — Open-Meteo based weather (no API key required)
 * Shows current conditions + details, caches data for the clock mini-widget.
 */

import { getElement, createElement, clearChildren, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber } from "../utils/date.js";
import { wmoInfo } from "./clock.js";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const CITIES = {
  Tehran: { fa: "تهران", lat: 35.6892, lon: 51.389 },
  Qazvin: { fa: "قزوین", lat: 36.2688, lon: 50.0041 },
  Mashhad: { fa: "مشهد", lat: 36.2605, lon: 59.6168 },
  Isfahan: { fa: "اصفهان", lat: 32.6539, lon: 51.666 },
  Tabriz: { fa: "تبریز", lat: 38.0962, lon: 46.2738 },
  Shiraz: { fa: "شیراز", lat: 29.5918, lon: 52.5837 },
  Karaj: { fa: "کرج", lat: 35.8355, lon: 50.9915 },
  Ahvaz: { fa: "اهواز", lat: 31.3183, lon: 48.6706 },
  Yazd: { fa: "یزد", lat: 31.8974, lon: 54.3569 },
  Rasht: { fa: "رشت", lat: 37.2808, lon: 49.5832 },
  Bandar_Abbas: { fa: "بندرعباس", lat: 27.1865, lon: 56.2808 },
};

export class WeatherManager {
  constructor() {
    this.city = "Tehran";
    this.refreshTimer = null;
    this.info = getElement("weatherInfo");
    this.citySelect = getElement("citySelect");
  }

  async initialize() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.loadCached();
    this.fetchWeather();
    this.refreshTimer = setInterval(() => this.fetchWeather(), CACHE_TTL);
  }

  async loadSettings() {
    const result = await storage.get("weatherSettings");
    const s = result.weatherSettings;
    if (s?.city && CITIES[s.city]) {
      this.city = s.city;
    }
    if (this.citySelect) this.citySelect.value = this.city;
  }

  async saveSettings() {
    await storage.set({ weatherSettings: { city: this.city } });
  }

  async loadCached() {
    const result = await storage.get("cachedWeather");
    const cached = result.cachedWeather;
    if (cached?.data?.current && cached.city === this.city) {
      this.render(cached.data, cached.city);
    }
  }

  setupEventListeners() {
    safeAddEventListener(this.citySelect, "change", (e) => {
      this.city = e.target.value;
      this.saveSettings();
      this.fetchWeather();
    });
  }

  async fetchWithTimeout(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchWeather() {
    if (!this.info) return;
    const city = CITIES[this.city] || CITIES.Tehran;

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FTehran`;

      const res = await this.fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      await storage.set({
        cachedWeather: { city: this.city, data, ts: Date.now() },
      });
      this.render(data, this.city);
      // notify other widgets (clock mini-weather)
      window.dispatchEvent(new CustomEvent("bookina:weather"));
    } catch (error) {
      console.warn("Weather fetch failed:", error.message);
      // if no cached content is visible, show error
      if (!this.info.querySelector(".weather-main")) {
        this.renderError(error);
      }
    }
  }

  render(data, cityKey) {
    if (!this.info) return;
    const cur = data.current || {};
    const daily = data.daily || {};

    const temp = Math.round(cur.temperature_2m ?? 0);
    const feels = Math.round(cur.apparent_temperature ?? 0);
    const humidity = cur.relative_humidity_2m ?? "—";
    const wind = Math.round(cur.wind_speed_10m ?? 0);
    const code = cur.weather_code ?? 0;
    const info = wmoInfo(code);
    const max = daily.temperature_2m_max?.[0];
    const min = daily.temperature_2m_min?.[0];
    const cityName = CITIES[cityKey]?.fa || "تهران";

    clearChildren(this.info);

    const main = createElement("div", { className: "weather-main" });
    const emoji = createElement("div", { className: "weather-emoji" }, info.emoji);
    const tWrap = createElement("div");
    const tempEl = createElement("div", { className: "weather-temp" }, `${toPersianNumber(temp)}°`);
    const desc = createElement("div", { className: "weather-desc" }, info.desc);
    const city = createElement("div", { className: "weather-city" }, `📍 ${cityName}`);
    tWrap.appendChild(tempEl);
    tWrap.appendChild(desc);
    tWrap.appendChild(city);
    main.appendChild(emoji);
    main.appendChild(tWrap);
    this.info.appendChild(main);

    const details = createElement("div", { className: "weather-details" });
    const items = [
      { l: "احساس‌شده", v: `${toPersianNumber(feels)}°` },
      { l: "رطوبت", v: `${toPersianNumber(humidity)}٪` },
      { l: "باد", v: `${toPersianNumber(wind)} کیلومتر/ساعت` },
      {
        l: "بیشینه / کمینه",
        v: max != null ? `${toPersianNumber(Math.round(max))}° / ${toPersianNumber(Math.round(min))}°` : "—",
      },
    ];
    items.forEach((it) => {
      const box = createElement("div", { className: "wd" });
      const v = createElement("div", { className: "wv" }, it.v);
      const l = createElement("div", { className: "wl" }, it.l);
      box.appendChild(v);
      box.appendChild(l);
      details.appendChild(box);
    });
    this.info.appendChild(details);
  }

  renderError(error) {
    if (!this.info) return;
    clearChildren(this.info);
    const box = createElement("div", { className: "error-box" });
    const title = createElement("div", { className: "err-title" }, "⚠ خطا در دریافت اطلاعات هوا");
    const detail = createElement(
      "div",
      {},
      error?.name === "AbortError" ? "درخواست زمان‌بر شد — اینترنت را بررسی کنید" : "اتصال به سرویس هوا برقرار نشد"
    );
    const retry = createElement("button", { className: "retry-btn" }, "تلاش مجدد");
    safeAddEventListener(retry, "click", () => this.fetchWeather());
    box.appendChild(title);
    box.appendChild(detail);
    box.appendChild(retry);
    this.info.appendChild(box);
  }

  destroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async refresh() {
    await this.fetchWeather();
  }

  async saveState() {
    await this.saveSettings();
  }

  async setCity(city) {
    if (!CITIES[city]) return;
    this.city = city;
    if (this.citySelect) this.citySelect.value = city;
    await this.saveSettings();
    await this.fetchWeather();
  }
}
