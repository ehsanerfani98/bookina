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
      // نمایش حالت لودینگ فقط در صورتی که کش خالی باشد
      if (newsList && this.newsItems.length === 0) {
        newsList.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>در حال دریافت آخرین اخبار...</p>
          </div>
        `;
      }

      if (refreshBtn) {
        // اضافه کردن fa-spin برای انیمیشن چرخش آیکون هنگام لودینگ
        refreshBtn.className = 'fas fa-refresh fa-spin refresh-news';
      }

      // استفاده از سرویس rss2json برای دور زدن CORS و دریافت مستقیم JSON
      const feedUrl = "https://www.zoomit.ir/feed";
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'ok' && data.items && data.items.length > 0) {
        // نگاشت داده‌های دریافتی به فرمت استاندارد برنامه (حداکثر ۱۰ خبر)
        this.newsItems = data.items.slice(0, 10).map((item, index) => ({
          id: `news_${index}`,
          title: item.title || 'بدون عنوان',
          link: item.link || '#',
          description: item.description || '',
          pubDate: item.pubDate || ''
        }));

        this.lastUpdate = new Date();
        await this.saveSettings();
        await this.saveCachedNews();
        this.renderNews();
        console.log('News updated successfully:', this.newsItems.length, 'items');
      } else {
        throw new Error(data.message || 'داده‌ای از فید دریافت نشد');
      }

    } catch (error) {
      console.error('News API Error:', error);
      
      // اگر خطا رخ داد اما اخبار کش‌شده داریم، آن‌ها را نگه می‌داریم تا صفحه خالی نماند
      if (this.newsItems.length > 0) {
        console.log('Keeping cached news due to fetch error');
      } else {
        // اگر کش هم نداریم، پیام خطا نمایش می‌دهیم
        if (newsList) {
          newsList.innerHTML = `
            <div class="error">
              <p>⚠ خطا در دریافت اخبار</p>
              <p class="error-details">اتصال به سرویس اخبار برقرار نشد</p>
              <button class="retry-news-btn">تلاش مجدد</button>
            </div>
          `;
          const retryBtn = newsList.querySelector('.retry-news-btn');
          if (retryBtn) {
            safeAddEventListener(retryBtn, 'click', () => this.loadNews());
          }
        }
      }
    } finally {
      this.isLoading = false;
      if (refreshBtn) {
        // بازنشانی آیکون به حالت عادی
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
