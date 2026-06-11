/**
 * News Manager Module
 * Handles news feed integration and display
 */
import { getElement, safeAddEventListener, escapeHtml } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';

export class NewsManager {
  constructor() {
    this.storage = new StorageManager();
    this.newsItems = [];
    this.refreshInterval = null;
    this.isLoading = false;
    this.lastUpdate = null;
  }

  async initialize() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      // Try to load cached news first for instant display
      await this.loadCachedNews();
      // Then fetch fresh news in background (async, no await)
      this.loadNews();
      this.startAutoRefresh();
      console.log('News module initialized');
    } catch (error) {
      console.error('Failed to initialize news module:', error);
    }
  }

  async loadSettings() {
    const result = await this.storage.get('newsSettings');
    const settings = result.newsSettings;
    if (settings) {
      this.lastUpdate = settings.lastUpdate ? new Date(settings.lastUpdate) : null;
    }
  }

  async saveSettings() {
    await this.storage.set({
      newsSettings: {
        lastUpdate: this.lastUpdate
      }
    });
  }

  async loadCachedNews() {
    const result = await this.storage.get('cachedNews');
    if (result.cachedNews && result.cachedNews.items && result.cachedNews.items.length > 0) {
      this.newsItems = result.cachedNews.items;
      this.lastUpdate = result.cachedNews.lastUpdate ? new Date(result.cachedNews.lastUpdate) : null;
      this.renderNews();
      console.log('Loaded cached news:', this.newsItems.length, 'items');
    }
  }

  async saveCachedNews() {
    await this.storage.set({
      cachedNews: {
        items: this.newsItems,
        lastUpdate: this.lastUpdate
      }
    });
  }

  setupEventListeners() {
    const refreshBtn = getElement('refresh');

    if (refreshBtn) {
      safeAddEventListener(refreshBtn, 'click', () => this.loadNews());
    }
  }

  async loadNews() {
    if (this.isLoading) return;

    this.isLoading = true;
    const newsList = getElement('newsList');
    const refreshBtn = getElement('refresh');

    try {
      // Show loading state only when there's no cached content
      if (newsList && this.newsItems.length === 0) {
        newsList.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>در حال دریافت آخرین اخبار...</p>
          </div>
        `;
      }

      if (refreshBtn) {
        refreshBtn.className = 'fas fa-refresh refresh-news';
      }

      // Multiple CORS proxy options with increased timeout
      const feedUrl = "https://www.zoomit.ir/feed";
      const proxies = [
        "https://api.allorigins.win/get?url=" + encodeURIComponent(feedUrl),
        "https://corsproxy.io/?" + encodeURIComponent(feedUrl),
        "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(feedUrl),
        "https://proxy.cors.sh/" + encodeURIComponent(feedUrl)
      ];

      let response;
      let data;

      for (const proxyUrl of proxies) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
          response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();
            // Try JSON (allorigins format), else treat as raw XML
            try {
              data = JSON.parse(text);
            } catch {
              data = { contents: text };
            }
            break;
          }
        } catch (error) {
          console.log(`Proxy ${proxyUrl} failed:`, error);
          clearTimeout(timeoutId);
          continue;
        }
      }

      // If all proxies failed but we have cached news, keep showing it
      if (!response || !data || !data.contents) {
        if (this.newsItems.length > 0) {
          console.log('Using cached news, fetch failed');
          return;
        }
        if (newsList) {
          newsList.innerHTML = `<div class="error"><p>⚠ خطا در دریافت اخبار</p><p class="error-details">اتصال به سرویس اخبار برقرار نشد</p><button class="retry-news-btn">تلاش مجدد</button></div>`;
          const retryBtn = newsList.querySelector('.retry-news-btn');
          if (retryBtn) {
            safeAddEventListener(retryBtn, 'click', () => this.loadNews());
          }
        }
        return;
      }

      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, "application/xml");
      const items = xml.querySelectorAll("item");

      this.newsItems = [];
      items.forEach((item, index) => {
        if (index < 10) { // Limit to 10 items
          const title = item.querySelector("title")?.textContent || 'بدون عنوان';
          const link = item.querySelector("link")?.textContent || '#';
          const description = item.querySelector("description")?.textContent || '';
          const pubDate = item.querySelector("pubDate")?.textContent || '';

          this.newsItems.push({
            id: `news_${index}`,
            title,
            link,
            description,
            pubDate
          });
        }
      });

      this.lastUpdate = new Date();
      await this.saveSettings();
      await this.saveCachedNews();
      this.renderNews();

    } catch (error) {
      console.error('News API Error:', error);
      // Keep cached news visible instead of showing error
      if (this.newsItems.length > 0) {
        console.log('Keeping cached news due to fetch error');
        return;
      }
      if (newsList) {
        newsList.innerHTML = `
          <div class="error">
            <p>⚠ خطا در دریافت اخبار</p>
            <p class="error-details">${error.message}</p>
            <button class="retry-news-btn">تلاش مجدد</button>
          </div>
        `;
        const retryBtn = newsList.querySelector('.retry-news-btn');
        if (retryBtn) {
          safeAddEventListener(retryBtn, 'click', () => this.loadNews());
        }
      }
    } finally {
      this.isLoading = false;
      if (refreshBtn) {
        refreshBtn.className = 'fas fa-refresh';
      }
    }
  }

  renderNews() {
    const newsList = getElement('newsList');
    if (!newsList) return;

    if (this.newsItems.length === 0) {
      newsList.innerHTML = '<div class="empty-state">هیچ خبری یافت نشد</div>';
      return;
    }

    let html = '';
    this.newsItems.forEach((news, index) => {
      html += `
        <div class="news-item" data-index="${index}">
          <a href="${news.link}" target="_blank" class="news-link">
            <span class="news-title">${escapeHtml(news.title)}</span>
          </a>
          <div class="news-meta">
            ${news.pubDate ? `<span class="news-date">${this.formatDate(news.pubDate)}</span>` : ''}
          </div>
        </div>
      `;
    });

    newsList.innerHTML = html;
  }


  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  startAutoRefresh() {
    // Refresh news every 2 hours
    this.refreshInterval = setInterval(() => {
      this.loadNews();
    }, 2 * 60 * 60 * 1000);
  }

  async refresh() {
    await this.loadNews();
  }

  async saveState() {
    await this.saveSettings();
  }

  // Cleanup method
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Public method to get latest news
  getLatestNews(count = 5) {
    return this.newsItems.slice(0, count);
  }
}
