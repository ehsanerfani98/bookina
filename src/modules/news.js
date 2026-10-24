/**
 * News Module — latest news from Zoomit RSS
 * Fetch strategies (in order):
 *   1. Direct fetch of the RSS feed + client-side XML parsing
 *      (works inside the extension thanks to host_permissions, no third-party proxy)
 *   2. allorigins CORS proxy + XML parsing
 *   3. rss2json API (legacy, often rate-limited / 403)
 * First item rendered large with thumbnail, rest as compact rows.
 */

import { getElement, createElement, clearChildren, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { timeAgo } from "../utils/date.js";

const FEED_URL = "https://www.zoomit.ir/feed";
const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`;
const PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(FEED_URL + "/")}`;
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
      const items = await this.fetchWithFallback();
      if (items.length) {
        this.items = items.slice(0, MAX_ITEMS);
        await this.saveCache();
        this.render();
      } else {
        throw new Error("empty feed");
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

  /**
   * Try each fetch strategy until one returns usable items
   */
  async fetchWithFallback() {
    const strategies = [
      { name: "direct", fn: () => this.fetchDirect(FEED_URL) },
      { name: "allorigins", fn: () => this.fetchDirect(PROXY_URL) },
      { name: "rss2json", fn: () => this.fetchRss2Json() },
    ];

    let lastError;
    for (const strategy of strategies) {
      try {
        const items = await strategy.fn();
        if (items && items.length) return items;
        throw new Error("no items");
      } catch (error) {
        lastError = error;
        console.warn(`News strategy '${strategy.name}' failed:`, error.message);
      }
    }
    throw lastError || new Error("all strategies failed");
  }

  /**
   * Fetch raw RSS XML and parse it client-side
   */
  async fetchDirect(url) {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlText = await res.text();
    return this.parseXmlFeed(xmlText);
  }

  /**
   * Legacy rss2json strategy (JSON output)
   */
  async fetchRss2Json() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) {
      throw new Error(data.message || "rss2json error");
    }
    return data.items.map((item) => this.normalizeItem({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      thumbnail: item.thumbnail || item.enclosure?.link || "",
    }));
  }

  /**
   * Parse RSS/XML content into normalized items
   */
  parseXmlFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML parse error");

    const nodes = Array.from(doc.getElementsByTagName("item"));
    if (!nodes.length) throw new Error("no <item> in feed");

    return nodes.slice(0, MAX_ITEMS).map((node) => {
      const getText = (tag) => {
        const el = node.getElementsByTagName(tag)[0];
        return el ? (el.textContent || "").trim() : "";
      };
      const mediaThumb =
        node.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail")[0] ||
        node.getElementsByTagName("media:thumbnail")[0];
      const enclosure = node.getElementsByTagName("enclosure")[0];

      let thumbnail = mediaThumb?.getAttribute("url") || "";
      if (!thumbnail && enclosure) thumbnail = enclosure.getAttribute("url") || "";
      if (!thumbnail) {
        const html = getText("content:encoded") + getText("description");
        const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (m) thumbnail = m[1];
      }

      return this.normalizeItem({
        title: getText("title"),
        link: getText("link"),
        pubDate: getText("pubDate"),
        thumbnail,
      });
    });
  }

  normalizeItem(raw) {
    return {
      id: `news_${Math.abs(this._hash(raw.link || raw.title || ""))}`,
      title: raw.title || "بدون عنوان",
      link: raw.link || "#",
      pubDate: raw.pubDate || "",
      thumbnail: raw.thumbnail || "",
    };
  }

  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return h;
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

    // const [first, ...rest] = this.items;
    const rest = this.items;

    // featured item
    // const feat = createElement("div", { className: "news" });
    const ph = createElement("div", { className: "ph" });
    // if (first.thumbnail) {
    //   const img = createElement("img", { src: first.thumbnail, alt: "" });
    //   safeAddEventListener(img, "error", () => {
    //     img.remove();
    //     ph.textContent = "📰";
    //   });
    //   ph.appendChild(img);
    // } else {
    //   ph.textContent = "📰";
    // }

    const nt = createElement("div", { className: "nt" });
    // const titleB = createElement("b", {}, first.title);
    // const meta = createElement("span", { className: "sm", style: "color: var(--ac)" },
    //   `زومیت${first.pubDate ? " · " + this.formatDate(first.pubDate) : ""}`);
    // nt.appendChild(titleB);
    // nt.appendChild(meta);
    // feat.appendChild(ph);
    // feat.appendChild(nt);

    // safeAddEventListener(feat, "click", () => {
    //   if (first.link && first.link !== "#") window.open(first.link, "_blank");
    // });

    // this.list.appendChild(feat);

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
