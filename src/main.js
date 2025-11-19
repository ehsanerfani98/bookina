/**
 * Main Application Entry Point
 * Modular refactoring of Bookina project
 */

import { BookmarksManager } from './modules/bookmarks.js';
import { TodosManager } from './modules/todos.js';
import { CalendarManager } from './modules/calendar.js';
import { WeatherManager } from './modules/weather.js';
import { NewsManager } from './modules/news.js';
import { StickyNotesManager } from './modules/stickyNotes.js';
import { SettingsManager } from './modules/settings.js';
import { getElement, safeAddEventListener } from './utils/dom.js';

class BookinaApp {
  constructor() {
    this.modules = {};
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize all modules
      await this.initializeModules();
      
      // Setup tab navigation
      this.setupTabNavigation();
      
      // Setup global event listeners
      this.setupGlobalEvents();
      
      console.log('Bookina App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Bookina App:', error);
    }
  }

  async initializeModules() {
    // Initialize each module
    this.modules.bookmarks = new BookmarksManager();
    this.modules.todos = new TodosManager();
    this.modules.calendar = new CalendarManager();
    this.modules.weather = new WeatherManager();
    this.modules.news = new NewsManager();
    this.modules.stickyNotes = new StickyNotesManager();
    this.modules.settings = new SettingsManager();

    // Wait for all modules to be ready
    await Promise.all([
      this.modules.bookmarks.initialize(),
      this.modules.todos.initialize(),
      this.modules.calendar.initialize(),
      this.modules.weather.initialize(),
      this.modules.news.initialize(),
      this.modules.stickyNotes.initialize(),
      this.modules.settings.initialize()
    ]);
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      safeAddEventListener(tab, 'click', () => {
        const targetTab = tab.getAttribute('data-tab');

        // Deactivate all tabs and panes
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Activate selected tab and pane
        tab.classList.add('active');
        const targetPane = getElement(targetTab);
        if (targetPane) {
          targetPane.classList.add('active');
        }
      });
    });
  }

  setupGlobalEvents() {
    // Handle window resize for responsive adjustments
    safeAddEventListener(window, 'resize', () => {
      this.modules.stickyNotes.handleResize();
    });

    // Handle beforeunload to save state
    safeAddEventListener(window, 'beforeunload', () => {
      this.saveAppState();
    });
  }

  async saveAppState() {
    // Save state of all modules that need it
    const savePromises = Object.values(this.modules).map(module => {
      if (typeof module.saveState === 'function') {
        return module.saveState();
      }
      return Promise.resolve();
    });

    await Promise.all(savePromises);
  }

  // Public API for external access if needed
  getModule(moduleName) {
    return this.modules[moduleName];
  }

  // Method to refresh all data
  async refreshAll() {
    const refreshPromises = Object.values(this.modules).map(module => {
      if (typeof module.refresh === 'function') {
        return module.refresh();
      }
      return Promise.resolve();
    });

    await Promise.all(refreshPromises);
  }
}

// Export for testing or external usage
export default BookinaApp;
