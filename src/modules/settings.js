/**
 * Settings Manager Module
 * Handles application settings and configuration management
 */
import { getElement, safeAddEventListener } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';

export class SettingsManager {
  constructor() {
    this.storage = new StorageManager();
    this.settings = {};
    this.availableBackgrounds = [
      'bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 
      'bg5.jpg', 'bg6.jpg', 'bg7.jpg', 'bg8.jpg'
    ];
  }

  async initialize() {
    try {
      await this.loadSettings();
      this.setupEventListeners();
      this.setupBackgroundSelection();
      this.applySettings();
      console.log('Settings module initialized');
    } catch (error) {
      console.error('Failed to initialize settings module:', error);
    }
  }

  async loadSettings() {
    const result = await this.storage.get('appSettings');
    this.settings = result.appSettings || this.getDefaultSettings();
  }

  async saveSettings() {
    console.log('saveSettings called with:', this.settings);
    try {
      await this.storage.set({ appSettings: this.settings });
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      language: 'fa',
      background: 'bg1.jpg',
      autoRefresh: {
        weather: true,
        news: true
      },
      notifications: {
        enabled: true,
        sound: true
      },
      layout: {
        compactMode: false,
        sidebarPosition: 'left'
      }
    };
  }

  setupEventListeners() {
    const settingsBtn = getElement('settingsBtn');
    const settingModal = getElement('settingModal');
    const exportBtn = getElement('exportBackup');
    const importBtn = getElement('importBackup');
    const importFile = getElement('importFile');

    if (settingsBtn) {
      safeAddEventListener(settingsBtn, 'click', () => this.showSettings());
    }

    if (settingModal) {
      safeAddEventListener(settingModal, 'click', (e) => {
        if (e.target === settingModal) {
          this.hideSettings();
        }
      });
    }

    if (exportBtn) {
      safeAddEventListener(exportBtn, 'click', () => this.exportBackup());
    }

    if (importBtn) {
      safeAddEventListener(importBtn, 'click', () => importFile?.click());
    }

    if (importFile) {
      safeAddEventListener(importFile, 'change', (e) => this.importBackup(e));
    }

    // Background selection
    this.setupBackgroundSelection();
    
    // Theme selection (only if element exists)
    this.setupThemeSelection();
  }

  setupBackgroundSelection() {
    const backgroundsContainer = getElement('backgrounds');
    if (!backgroundsContainer) return;

    // Clear existing backgrounds
    backgroundsContainer.innerHTML = '';

    // Create background thumbnails
    this.availableBackgrounds.forEach(img => {
      const thumb = document.createElement('div');
      thumb.className = 'bg-thumb';
      thumb.style.backgroundImage = `url('images/${img}')`;
      thumb.dataset.img = img;
      
      if (this.settings.background === img) {
        thumb.classList.add('selected');
      }

      safeAddEventListener(thumb, 'click', () => {
        this.changeBackground(img);
      });

      backgroundsContainer.appendChild(thumb);
    });
  }

  setupThemeSelection() {
    const themeSelect = getElement('themeSelect');
    if (!themeSelect) return;

    themeSelect.value = this.settings.theme;
    
    safeAddEventListener(themeSelect, 'change', (e) => {
      this.changeTheme(e.target.value);
    });
  }

  showSettings() {
    const settingModal = getElement('settingModal');
    if (settingModal) {
      settingModal.style.display = 'flex';
      this.updateSettingsDisplay();
    }
  }

  hideSettings() {
    const settingModal = getElement('settingModal');
    if (settingModal) {
      settingModal.style.display = 'none';
    }
  }

  updateSettingsDisplay() {
    // Update all settings controls to reflect current values
    const themeSelect = getElement('themeSelect');
    if (themeSelect) {
      themeSelect.value = this.settings.theme;
    }

    // Update background selection
    document.querySelectorAll('.bg-thumb').forEach(thumb => {
      thumb.classList.toggle('selected', thumb.dataset.img === this.settings.background);
    });
  }

  changeBackground(backgroundImage) {
    console.log('changeBackground called with:', backgroundImage);
    this.settings.background = backgroundImage;
    this.saveSettings();
    this.applyBackground();
    this.updateSettingsDisplay();
  }

  changeTheme(theme) {
    this.settings.theme = theme;
    this.saveSettings();
    this.applyTheme();
  }

  applySettings() {
    this.applyBackground();
    this.applyTheme();
  }

  applyBackground() {
    document.body.style.backgroundImage = `url('images/${this.settings.background}')`;
  }

  applyTheme() {
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark');
    
    // Add current theme class
    document.body.classList.add(`theme-${this.settings.theme}`);
  }

  async exportBackup() {
    try {
      // Collect data from all modules
      const bookmarksResult = await this.storage.get('bookmarks');
      const todosResult = await this.storage.get('todos');
      const stickyNotesResult = await this.storage.get('stickyNotes');
      const weatherSettingsResult = await this.storage.get('weatherSettings');
      const newsSettingsResult = await this.storage.get('newsSettings');

      const backupData = {
        bookmarks: bookmarksResult.bookmarks || [],
        todos: todosResult.todos || [],
        stickyNotes: stickyNotesResult.stickyNotes || [],
        settings: this.settings,
        weatherSettings: weatherSettingsResult.weatherSettings || {},
        newsSettings: newsSettingsResult.newsSettings || {},
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Bookina-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('بکاپ با موفقیت ذخیره شد ✅', 'success');
    } catch (error) {
      console.error('Export backup error:', error);
      this.showNotification('خطا در ذخیره بکاپ ❌', 'error');
    }
  }

  async importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          
          // Validate backup structure
          if (!this.validateBackupData(backupData)) {
            throw new Error('فرمت فایل بکاپ نامعتبر است');
          }

          // Restore data to storage
          const restorePromises = [];
          
          if (backupData.bookmarks) {
            restorePromises.push(this.storage.set({ bookmarks: backupData.bookmarks }));
          }
          
          if (backupData.todos) {
            restorePromises.push(this.storage.set({ todos: backupData.todos }));
          }
          
          if (backupData.stickyNotes) {
            restorePromises.push(this.storage.set({ stickyNotes: backupData.stickyNotes }));
          }
          
          if (backupData.settings) {
            this.settings = { ...this.settings, ...backupData.settings };
            restorePromises.push(this.saveSettings());
          }
          
          if (backupData.weatherSettings) {
            restorePromises.push(this.storage.set({ weatherSettings: backupData.weatherSettings }));
          }
          
          if (backupData.newsSettings) {
            restorePromises.push(this.storage.set({ newsSettings: backupData.newsSettings }));
          }

          await Promise.all(restorePromises);
          
          // Apply settings
          this.applySettings();
          
          // Refresh all modules
          if (window.bookinaApp) {
            await window.bookinaApp.refreshAll();
          }

          this.showNotification('بکاپ با موفقیت بازیابی شد ✅', 'success');
          
          // Reset file input
          event.target.value = '';
          
        } catch (error) {
          console.error('Import backup error:', error);
          this.showNotification('فایل بکاپ معتبر نیست ❌', 'error');
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      this.showNotification('خطا در خواندن فایل ❌', 'error');
    }
  }

  validateBackupData(data) {
    // Basic validation - check if it has expected structure
    return data && (
      Array.isArray(data.bookmarks) ||
      Array.isArray(data.todos) ||
      Array.isArray(data.stickyNotes) ||
      typeof data.settings === 'object'
    );
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    safeAddEventListener(closeBtn, 'click', () => {
      notification.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // Public API methods
  getSetting(key, defaultValue = null) {
    return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
  }

  async setSetting(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
    this.applySettings();
  }

  async resetSettings() {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    this.applySettings();
    this.updateSettingsDisplay();
  }

  async saveState() {
    await this.saveSettings();
  }

  async refresh() {
    await this.loadSettings();
    this.applySettings();
    this.updateSettingsDisplay();
  }

  // Get current settings for external use
  getCurrentSettings() {
    return { ...this.settings };
  }
}
