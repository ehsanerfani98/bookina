/**
 * Weather Manager Module
 * Handles weather information display and API integration
 */
import { getElement, safeAddEventListener } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';
import { WEATHER_API_KEY } from '../config.js';

export class WeatherManager {
  constructor() {
    this.storage = new StorageManager();
    this.API_KEY = WEATHER_API_KEY;
    this.currentCity = 'Tehran';
    this.refreshInterval = null;
    this.lastUpdate = null;
  }

  async initialize() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      // Load cached weather first for instant display
      await this.loadCachedWeather();
      // Then fetch fresh data in background
      this.fetchWeather(this.currentCity);
      this.startAutoRefresh();
      console.log('Weather module initialized');
    } catch (error) {
      console.error('Failed to initialize weather module:', error);
    }
  }

  async loadSettings() {
    const result = await this.storage.get('weatherSettings');
    const settings = result.weatherSettings;
    if (settings && settings.city) {
      this.currentCity = settings.city;

      // Update city select if exists
      const citySelect = getElement('citySelect');
      if (citySelect) {
        citySelect.value = this.currentCity;
      }
    }
  }

  async saveSettings() {
    await this.storage.set({
      weatherSettings: {
        city: this.currentCity,
        lastUpdate: this.lastUpdate
      }
    });
  }

  async loadCachedWeather() {
    const result = await this.storage.get('cachedWeather');
    if (result.cachedWeather) {
      const { weatherData, city, lastUpdate } = result.cachedWeather;
      if (weatherData && city === this.currentCity) {
        this.lastUpdate = lastUpdate ? new Date(lastUpdate) : null;
        this.renderWeather(weatherData);
        console.log('Loaded cached weather for:', city);
      }
    }
  }

  async saveCachedWeather(weatherData) {
    await this.storage.set({
      cachedWeather: {
        weatherData,
        city: this.currentCity,
        lastUpdate: this.lastUpdate
      }
    });
  }

  setupEventListeners() {
    const citySelect = getElement('citySelect');

    safeAddEventListener(citySelect, 'change', (e) => {
      this.currentCity = e.target.value;
      this.fetchWeather(this.currentCity);
      this.saveSettings();
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

  async fetchWeather(city) {
    const weatherInfo = getElement('weatherInfo');
    if (!weatherInfo) return;

    try {
      // Show loading state only if no cached data is displayed
      const hasCached = weatherInfo.querySelector('.weather-card') !== null;
      if (!hasCached) {
        weatherInfo.innerHTML = `
          <div class="loading">
            <div class="spinner"></div>
            <p>در حال دریافت اطلاعات آب و هوا...</p>
          </div>
        `;
      }

      // Get coordinates first with timeout
      const geoResponse = await this.fetchWithTimeout(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${this.API_KEY}`
      );

      if (!geoResponse.ok) {
        throw new Error(`خطا در دریافت مختصات: ${geoResponse.status}`);
      }

      const geoData = await geoResponse.json();

      if (!geoData.length) {
        weatherInfo.innerHTML = `
          <div class="error">
            <p>❌ شهر "${city}" پیدا نشد</p>
            <button class="retry-weather-btn">تلاش مجدد</button>
          </div>
        `;
        const retryBtn = weatherInfo.querySelector('.retry-weather-btn');
        if (retryBtn) {
          safeAddEventListener(retryBtn, 'click', () => this.fetchWeather(this.currentCity));
        }
        return;
      }

      const { lat, lon } = geoData[0];

      // Get weather data with timeout
      const weatherResponse = await this.fetchWithTimeout(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&lang=fa&units=metric`
      );

      if (!weatherResponse.ok) {
        throw new Error(`خطا در دریافت آب و هوا: ${weatherResponse.status}`);
      }

      const weatherData = await weatherResponse.json();

      this.lastUpdate = new Date();
      await this.saveSettings();
      await this.saveCachedWeather(weatherData);
      this.renderWeather(weatherData);

    } catch (error) {
      console.error('Weather API Error:', error);

      // If we have cached data, keep showing it instead of error
      const hasCached = weatherInfo.querySelector('.weather-card') !== null;
      if (hasCached) {
        console.log('Keeping cached weather due to fetch error');
        return;
      }

      weatherInfo.innerHTML = `
        <div class="error">
          <p>⚠ خطا در دریافت اطلاعات</p>
          <p class="error-details">${error.name === 'AbortError' ? 'درخواست زمان‌بر شد (اینترنت خود را بررسی کنید)' : error.message}</p>
          <button class="retry-weather-btn">تلاش مجدد</button>
        </div>
      `;
      const retryBtn = weatherInfo.querySelector('.retry-weather-btn');
      if (retryBtn) {
        safeAddEventListener(retryBtn, 'click', () => this.fetchWeather(this.currentCity));
      }
    }
  }

  renderWeather(weatherData) {
    const weatherInfo = getElement('weatherInfo');
    if (!weatherInfo) return;

    const tempC = Math.round(weatherData.main.temp);
    const feelsLike = Math.round(weatherData.main.feels_like);
    const tempMin = Math.round(weatherData.main.temp_min);
    const tempMax = Math.round(weatherData.main.temp_max);
    const humidity = weatherData.main.humidity;
    const pressure = weatherData.main.pressure;
    const windSpeed = weatherData.wind?.speed || 0;
    const windDeg = weatherData.wind?.deg || 0;
    const description = weatherData.weather[0].description;
    const icon = weatherData.weather[0].icon;
    const cityName = weatherData.name;
    const country = weatherData.sys.country;

    // Convert numbers to Persian digits
    const toPersianDigits = (num) => {
      return num.toString().replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
    };

    // Get wind direction
    const getWindDirection = (deg) => {
      const directions = ['شمال', 'شمال شرقی', 'شرق', 'جنوب شرقی', 'جنوب', 'جنوب غربی', 'غرب', 'شمال غربی'];
      return directions[Math.round(deg / 45) % 8];
    };

    weatherInfo.innerHTML = `
      <div class="weather-card">
        <div class="weather-header">
          <div class="location-info">
            <h2>📍 ${cityName}, ${country}</h2>
            <p class="description">${description}</p>
          </div>
          <div class="temp-current">
            <span class="temp-value">${toPersianDigits(tempC)}</span>
            <span class="temp-unit">°C</span>
          </div>
        </div>
        
        <div class="update-time">
          <p>🕐 به‌روزرسانی: ${this.lastUpdate.toLocaleTimeString('fa-IR')}</p>
        </div>
      </div>
    `;
  }

  startAutoRefresh() {
    // Refresh weather every 30 minutes
    this.refreshInterval = setInterval(() => {
      this.fetchWeather(this.currentCity);
    }, 30 * 60 * 1000);
  }

  async refresh() {
    await this.fetchWeather(this.currentCity);
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

  // Public method to change city
  async setCity(city) {
    this.currentCity = city;
    await this.saveSettings();
    await this.fetchWeather(city);
  }

  // Public method to get current weather data
  getCurrentWeather() {
    return {
      city: this.currentCity,
      lastUpdate: this.lastUpdate
    };
  }
}
