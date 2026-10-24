/**
 * Rates Module — USD / EUR / 18k gold prices from TGJU public feed
 * Direct fetch works inside the extension (host_permissions); falls back to cache.
 */

import { getElement, createElement, clearChildren, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianPrice, toPersianNumber, timeAgo } from "../utils/date.js";

const FEED_URL = "https://call1.tgju.org/ajax.json";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const ITEMS = [
  { key: "price_dollar_rl", label: "دلار آمریکا", flag: "🇺🇸", sub: "USD" },
  { key: "price_eur", label: "یورو", flag: "🇪🇺", sub: "EUR" },
  { key: "tgju_gold_irg18", label: "طلای ۱۸ عیار", flag: "🟡", sub: "GRAM" },
];

export class RatesManager {
  constructor() {
    this.list = getElement("ratesList");
    this.refreshBtn = getElement("ratesRefresh");
    this.updatedEl = getElement("ratesUpdated");
    this.updatedAt = null;
  }

  async initialize() {
    this.setupEventListeners();
    await this.loadCached();
    this.fetchRates();
  }

  setupEventListeners() {
    safeAddEventListener(this.refreshBtn, "click", () => {
      this.refreshBtn.style.transition = "transform 0.5s ease";
      this.refreshBtn.style.transform = "rotate(360deg)";
      setTimeout(() => (this.refreshBtn.style.transform = ""), 500);
      this.fetchRates();
    });
  }

  async loadCached() {
    const result = await storage.get("cachedRates");
    const cached = result.cachedRates;
    if (cached?.items) {
      this.updatedAt = cached.ts ? new Date(cached.ts) : null;
      this.render(cached.items, cached.ts);
    }
  }

  async fetchRates() {
    try {
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cur = data.current || {};

      const items = [];
      ITEMS.forEach((it) => {
        const row = cur[it.key];
        if (row && row.p != null) {
          items.push({
            key: it.key,
            label: it.label,
            flag: it.flag,
            sub: it.sub,
            price: row.p,
            change: row.d,
            pct: parseFloat(row.dp) || 0,
          });
        }
      });

      if (items.length === 0) throw new Error("no data");

      this.updatedAt = new Date();
      await storage.set({
        cachedRates: { items, ts: this.updatedAt.getTime() },
      });
      this.render(items, this.updatedAt.getTime());
    } catch (error) {
      console.warn("Rates fetch failed:", error.message);
      // if we have nothing cached, show error state
      const result = await storage.get("cachedRates");
      if (!result.cachedRates?.items) {
        this.renderError();
      }
    }
  }

  sparkSvg(pct) {
    // decorative mini sparkline whose direction follows the change sign
    const up = pct >= 0;
    const color = up ? "#17c08b" : "#f0516d";
    const pts = up ? "0,12 18,9 36,10 54,6 72,7 100,2" : "0,2 18,5 36,4 54,8 72,7 100,12";
    return `<svg viewBox="0 0 100 14" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/></svg>`;
  }

  render(items, ts) {
    if (!this.list) return;
    clearChildren(this.list);

    items.forEach((item) => {
      const row = createElement("div", { className: "fx" });

      const ic = createElement("span", { className: "ic" }, item.flag);
      const spark = createElement("span", { className: "spark" });
      spark.innerHTML = this.sparkSvg(item.pct);

      const tag = createElement("span", { className: "sm" }, item.sub);

      const v = createElement("span", { className: "v" });
      const priceTxt = toPersianPrice(item.price);
      const pct = item.pct;
      if (pct !== 0) {
        const dir = pct > 0 ? "▲" : "▼";
        const cls = pct > 0 ? "up" : "down";
        const t = createElement("span", { className: `tag ${cls}` }, `${dir} ${toPersianNumber(Math.abs(pct).toFixed(1))}٪`);
        v.appendChild(t);
        v.appendChild(document.createElement("br"));
      }
      v.appendChild(document.createTextNode(priceTxt));

      row.appendChild(ic);
      row.appendChild(spark);
      row.appendChild(tag);
      row.appendChild(v);
      this.list.appendChild(row);
    });

    if (this.updatedEl && ts) {
      this.updatedEl.textContent = timeAgo(new Date(ts));
    }
  }

  renderError() {
    if (!this.list) return;
    clearChildren(this.list);
    const box = createElement("div", { className: "error-box" });
    box.innerHTML = `<div class="err-title">⚠ دریافت نرخ‌ها ممکن نشد</div><div>اتصال اینترنت را بررسی کنید</div>`;
    const retry = createElement("button", { className: "retry-btn" }, "تلاش مجدد");
    safeAddEventListener(retry, "click", () => this.fetchRates());
    box.appendChild(retry);
    this.list.appendChild(box);
  }

  destroy() {
    /* no timers */
  }

  async refresh() {
    await this.fetchRates();
  }

  async saveState() {
    return Promise.resolve();
  }
}
