/**
 * Storage Utility - Unified storage management for Chrome extension and localStorage
 */

export class StorageManager {
  constructor() {
    // More specific check for Chrome extension context
    // In Chrome new tab, we might have chrome object but not storage access
    this.isChromeExtension = typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.set === 'function' &&
      !window.location.href.startsWith('chrome://');
  }

  /**
   * Get data from storage
   * @param {string|string[]} keys - Key or array of keys to retrieve
   * @returns {Promise<Object>}
   */
  async get(keys) {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
          resolve(result);
        });
      });
    } else {
      // Fallback to localStorage for development
      if (typeof keys === 'string') {
        const value = localStorage.getItem(keys);
        return { [keys]: value ? JSON.parse(value) : null };
      } else {
        const result = {};
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          result[key] = value ? JSON.parse(value) : null;
        });
        return result;
      }
    }
  }

  /**
   * Set data in storage
   * @param {Object} data - Data to store
   * @returns {Promise<void>}
   */
  async set(data) {
    console.log('StorageManager.set called with:', data);
    console.log('isChromeExtension:', this.isChromeExtension);

    if (this.isChromeExtension) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
              console.error('Chrome storage error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log('Data saved to Chrome storage successfully');
              resolve();
            }
          });
        } catch (error) {
          console.error('Error in Chrome storage set:', error);
          reject(error);
        }
      });
    } else {
      Object.keys(data).forEach(key => {
        localStorage.setItem(key, JSON.stringify(data[key]));
        console.log(`Data saved to localStorage: ${key} =`, data[key]);
      });
      return Promise.resolve();
    }
  }

  /**
   * Remove data from storage
   * @param {string|string[]} keys - Key or array of keys to remove
   * @returns {Promise<void>}
   */
  async remove(keys) {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => {
          resolve();
        });
      });
    } else {
      if (typeof keys === 'string') {
        localStorage.removeItem(keys);
      } else {
        keys.forEach(key => localStorage.removeItem(key));
      }
      return Promise.resolve();
    }
  }

  /**
   * Clear all storage data
   * @returns {Promise<void>}
   */
  async clear() {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });
    } else {
      localStorage.clear();
      return Promise.resolve();
    }
  }
}

export const storage = new StorageManager();
