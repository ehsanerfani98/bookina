/**
 * News Module — latest news from Zoomit RSS (via rss2json)
 * First item rendered large with thumbnail, rest as compact rows.
 */

import { getElement, createElement, clearChildren, safeAddEventListener, escapeHtml } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { timeAgo } from "../utils/date.js";

const FEED_URL = "https://www.zoomit.ir/feed";
const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
const MAX_ITEMS = 8;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

export class NewsManager {
  constructor() {
    this.items = [];
    this.refreshTimer = null;
    this.isLoading = false;
    this.list = getElement("newsList");
    this.refreshBtn = getElement("refresh");
  }

  async initialize() {
    this.setupEventListeners();
    await this.loadCached();
    this.loadNews();
    this.refreshTimer = setInterval(() => this.loadNews(), CACHE_TTL);
    console.log("News module initialized");
  }

  setupEventListeners() {
    safeAddEventListener(this.refreshBtn, "click", () => this.loadNews());
  }

  async loadCached() {
    const result = await storage.get("cachedNews");
    const cached = result.cachedNews;
    if (cached?.items?.length) {
      this.items = cached.items;
      this.render();
    }
  }

  async saveCache() {
    await storage.set({ cachedNews: { items: this.items, ts: Date.now() } });
  }

  async loadNews() {
    if (this.isLoading) return;
    this.isLoading = true;

    const btn = this.refreshBtn;
    if (btn) btn.style.opacity = "0.5";

    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.status === "ok" && Array.isArray(data.items) && data.items.length) {
        this.items = data.items.slice(0, MAX_ITEMS).map((item, i) => ({
          id: `news_${i}`,
          title: item.title || "بدون عنوان",
          link: item.link || "#",
          pubDate: item.pubDate || "",
          thumbnail: item.thumbnail || item.enclosure?.link || "",
        }));
        await this.saveCache();
        this.render();
      } else {
        throw new Error(data.message || "empty feed");
      }
    } catch (error) {
      console.warn("News fetch failed:", error.message);
      if (this.items.length === 0) {
        this.renderError();
      }
    } finally {
      this.isLoading = false;
      if (btn) btn.style.opacity = "";
    }
  }

  formatDate(dateString) {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "";
      return timeAgo(d);
    } catch (e) {
      return "";
    }
  }

  render() {
    if (!this.list) return;
    clearChildren(this.list);

    if (this.items.length === 0) {
      this.list.appendChild(
        createElement("div", { className: "empty-sm" }, "هیچ خبری یافت نشد")
      );
      return;
    }

    const [first, ...rest] = this.items;

    // featured item
    const feat = createElement("div", { className: "news" });
    const ph = createElement("div", { className: "ph" });
    if (first.thumbnail) {
      const img = createElement("img", { src: first.thumbnail, alt: "" });
      safeAddEventListener(img, "error", () => {
        img.remove();
        ph.textContent = "📰";
      });
      ph.appendChild(img);
    } else {
      ph.textContent = "📰";
    }

    const nt = createElement("div", { className: "nt" });
    const titleB = createElement("b", {}, first.title);
    const meta = createElement("span", { className: "sm", style: "color: var(--ac)" },
      `زومیت${first.pubDate ? " · " + this.formatDate(first.pubDate) : ""}`);
    nt.appendChild(titleB);
    nt.appendChild(meta);
    feat.appendChild(ph);
    feat.appendChild(nt);

    safeAddEventListener(feat, "click", () => {
      if (first.link && first.link !== "#") window.open(first.link, "_blank");
    });

    this.list.appendChild(feat);

    // compact rows
    if (rest.length) {
      const rowsWrap = createElement("div", { className: "news-list" });
      rest.forEach((news) => {
        const row = createElement("div", { className: "news-item" });
        const t = createElement("span", { className: "ntitle" }, news.title);
        const d = createElement("span", { className: "ndate" }, news.pubDate ? this.formatDate(news.pubDate) : "");
        row.appendChild(t);
        row.appendChild(d);
        safeAddEventListener(row, "click", () => {
          if (news.link && news.link !== "#") window.open(news.link, "_blank");
        });
        rowsWrap.appendChild(row);
      });
      this.list.appendChild(rowsWrap);
    }
  }

  renderError() {
    if (!this.list) return;
    clearChildren(this.list);
    const box = createElement("div", { className: "error-box" });
    box.innerHTML = `<div class="err-title">⚠ خطا در دریافت اخبار</div><div>اتصال به سرویس اخبار برقرار نشد</div>`;
    const retry = createElement("button", { className: "retry-btn" }, "تلاش مجدد");
    safeAddEventListener(retry, "click", () => this.loadNews());
    box.appendChild(retry);
    this.list.appendChild(box);
  }

  destroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async refresh() {
    await this.loadNews();
  }

  async saveState() {
    await this.saveCache();
  }
}
