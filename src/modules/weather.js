/**
 * Weather Manager Module
 * Handles weather information display and API integration
 */
import { getElement } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';

export class WeatherManager {
  constructor() {
    this.storage = new StorageManager();
    this.API_KEY = "7e5281913ad99ee9c641fac9516fd191";
    this.currentCity = 'Tehran';
    this.refreshInterval = null;
    this.lastUpdate = null;
  }

  async initialize() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      await this.fetchWeather(this.currentCity);
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
    await this.storage.set({ weatherSettings: {
      city: this.currentCity,
      lastUpdate: this.lastUpdate
    }});
  }

  setupEventListeners() {
    const citySelect = getElement('citySelect');
    const refreshBtn = getElement('refreshWeather');

    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        this.currentCity = e.target.value;
        this.fetchWeather(this.currentCity);
        this.saveSettings();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchWeather(this.currentCity);
      });
    }
  }

  async fetchWeather(city) {
    const weatherInfo = getElement('weatherInfo');
    if (!weatherInfo) return;

    try {
      // Show loading state
      weatherInfo.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>در حال دریافت اطلاعات آب و هوا...</p>
        </div>
      `;

      // Get coordinates first
      const geoResponse = await fetch(
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
            <button onclick="window.bookinaApp.getModule('weather').fetchWeather('${this.currentCity}')">تلاش مجدد</button>
          </div>
        `;
        return;
      }

      const { lat, lon } = geoData[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&lang=fa&units=metric`
      );

      if (!weatherResponse.ok) {
        throw new Error(`خطا در دریافت آب و هوا: ${weatherResponse.status}`);
      }

      const weatherData = await weatherResponse.json();
      this.lastUpdate = new Date();
      await this.saveSettings();
      this.renderWeather(weatherData);

    } catch (error) {
      console.error('Weather API Error:', error);
      weatherInfo.innerHTML = `
        <div class="error">
          <p>⚠ خطا در دریافت اطلاعات</p>
          <p class="error-details">${error.message}</p>
          <button onclick="window.bookinaApp.getModule('weather').fetchWeather('${this.currentCity}')">تلاش مجدد</button>
        </div>
      `;
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
