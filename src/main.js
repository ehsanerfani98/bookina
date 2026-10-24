/**
 * Main Application Entry Point — Bookina 2.0
 * Modular architecture with a module registry that supports
 * enabling / disabling every module from settings.
 */

import { SettingsManager } from "./modules/settings.js";
import { ClockManager } from "./modules/clock.js";
import { CalendarManager } from "./modules/calendar.js";
import { HabitsManager } from "./modules/habits.js";
import { TodosManager } from "./modules/todos.js";
import { PomodoroManager } from "./modules/pomodoro.js";
import { QuickNoteManager } from "./modules/quickNote.js";
import { RatesManager } from "./modules/rates.js";
import { BookmarksManager } from "./modules/bookmarks.js";
import { NewsManager } from "./modules/news.js";
import { WeatherManager } from "./modules/weather.js";
import { StickyNotesManager } from "./modules/stickyNotes.js";
import { SearchManager } from "./modules/search.js";
import { getElement, safeAddEventListener, toggleModal } from "./utils/dom.js";

/** Factories for lazily creating modules */
const MODULE_FACTORIES = {
  search: () => new SearchManager(),
  clock: () => new ClockManager(),
  calendar: () => new CalendarManager(),
  habits: () => new HabitsManager(),
  tasks: () => new TodosManager(),
  pomodoro: () => new PomodoroManager(),
  quicknote: () => new QuickNoteManager(),
  rates: () => new RatesManager(),
  bookmarks: () => new BookmarksManager(),
  news: () => new NewsManager(),
  weather: () => new WeatherManager(),
  notes: () => new StickyNotesManager(),
};

class BookinaApp {
  constructor() {
    this.modules = {};
    this.initialize();
  }

  async initialize() {
    try {
      this.setupTabNavigation();
      this.setupGlobalEvents();

      // Settings must load first: it decides which modules are visible
      this.modules.settings = new SettingsManager();
      await this.modules.settings.initialize();

      // Initialize every enabled module concurrently
      await this.initializeEnabledModules();

      console.log("Bookina App initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Bookina App:", error);
    }
  }

  async initializeEnabledModules() {
    const settings = this.modules.settings;
    const jobs = [];

    Object.keys(MODULE_FACTORIES).forEach((id) => {
      if (settings.isModuleEnabled(id)) {
        jobs.push(this.startModule(id));
      }
    });

    await Promise.allSettled(jobs);
  }

  async startModule(id) {
    if (this.modules[id]) return this.modules[id];
    try {
      const instance = MODULE_FACTORIES[id]();
      this.modules[id] = instance;
      await instance.initialize();
      return instance;
    } catch (error) {
      console.error(`Failed to initialize module '${id}':`, error);
      delete this.modules[id];
      return null;
    }
  }

  stopModule(id) {
    const instance = this.modules[id];
    if (!instance) return;
    try {
      if (typeof instance.destroy === "function") instance.destroy();
    } catch (e) {
      console.warn(`Error destroying module '${id}':`, e);
    }
    delete this.modules[id];
  }

  /**
   * Called by settings when the user toggles a module
   */
  async applyModuleEnabled(id, enabled) {
    // 1. visibility
    if (id === "notes") {
      const btn = getElement("notesTabBtn");
      if (btn) btn.classList.toggle("mod-off", !enabled);
      if (!enabled) {
        // if user is currently on notes tab, go back to dashboard
        const notesTabBtn = getElement('notesTabBtn');
        if (notesTabBtn?.classList.contains("active")) {
          const mainTabBtn = document.querySelector('.tab[data-tab="main-tab"]');
          mainTabBtn?.click();
        }
      }
    } else {
      const el = document.querySelector(`[data-module="${id}"]`);
      if (el) el.classList.toggle("mod-off", !enabled);
    }

    // 2. lifecycle
    if (enabled) {
      await this.startModule(id);
    } else {
      this.stopModule(id);
    }
  }

  setupTabNavigation() {
    const tabs = document.querySelectorAll(".tab");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabs.forEach((tab) => {
      safeAddEventListener(tab, "click", () => {
        const targetTab = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.remove("active"));
        tabPanes.forEach((pane) => pane.classList.remove("active"));
        tab.classList.add("active");
        const targetPane = getElement(targetTab);
        if (targetPane) targetPane.classList.add("active");
      });
    });
  }

  setupGlobalEvents() {
    // generic [data-close] buttons inside modals
    safeAddEventListener(document, "click", (e) => {
      const closer = e.target.closest("[data-close]");
      if (closer) {
        toggleModal(closer.dataset.close, false);
      }
    });

    // click on modal backdrop closes it
    document.querySelectorAll(".modal").forEach((modal) => {
      safeAddEventListener(modal, "click", (e) => {
        if (e.target === modal) toggleModal(modal, false);
      });
    });

    // Escape closes open modals
    safeAddEventListener(document, "keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal.open").forEach((m) =>
          toggleModal(m, false)
        );
      }
    });

    safeAddEventListener(window, "resize", () => {
      this.modules.stickyNotes?.handleResize?.();
    });

    safeAddEventListener(window, "beforeunload", () => {
      this.saveAppState();
    });
  }

  async saveAppState() {
    const savePromises = Object.values(this.modules).map((module) => {
      if (typeof module.saveState === "function") {
        try {
          return module.saveState();
        } catch (e) {
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });
    await Promise.allSettled(savePromises);
  }

  getModule(moduleName) {
    return this.modules[moduleName];
  }

  async refreshAll() {
    const refreshPromises = Object.values(this.modules).map((module) => {
      if (typeof module.refresh === "function") {
        try {
          return module.refresh();
        } catch (e) {
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    });
    await Promise.allSettled(refreshPromises);
  }
}

export default BookinaApp;
