/**
 * Storage Utility - Unified storage management for Chrome extension and localStorage
 */

export class StorageManager {
  constructor() {
    // Specific check for Chrome extension context
    this.isChromeExtension =
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.set === "function";
  }

  /**
   * Get data from storage
   * @param {string|string[]} keys
   * @returns {Promise<Object>}
   */
  async get(keys) {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(keys, (result) => resolve(result || {}));
        } catch (e) {
          console.error("Chrome storage get error:", e);
          resolve({});
        }
      });
    }

    // Fallback to localStorage for web mode
    const read = (key) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (e) {
        return null;
      }
    };
    if (typeof keys === "string") {
      return { [keys]: read(keys) };
    }
    const result = {};
    keys.forEach((key) => {
      result[key] = read(key);
    });
    return result;
  }

  /**
   * Set data in storage
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async set(data) {
    if (this.isChromeExtension) {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
              console.error("Chrome storage error:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        } catch (error) {
          console.error("Error in Chrome storage set:", error);
          reject(error);
        }
      });
    }
    Object.keys(data).forEach((key) => {
      try {
        localStorage.setItem(key, JSON.stringify(data[key]));
      } catch (e) {
        console.error(`localStorage set failed for ${key}:`, e);
      }
    });
    return Promise.resolve();
  }

  /**
   * Remove data from storage
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.remove(keys, () => resolve());
        } catch (e) {
          resolve();
        }
      });
    }
    if (typeof keys === "string") {
      localStorage.removeItem(keys);
    } else {
      keys.forEach((key) => localStorage.removeItem(key));
    }
    return Promise.resolve();
  }

  /**
   * Clear all storage data
   * @returns {Promise<void>}
   */
  async clear() {
    if (this.isChromeExtension) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.clear(() => resolve());
        } catch (e) {
          resolve();
        }
      });
    }
    localStorage.clear();
    return Promise.resolve();
  }
}

export const storage = new StorageManager();
