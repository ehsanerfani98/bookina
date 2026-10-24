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
import { storage } from "./utils/storage.js";

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

      // Restore user's saved card order (before modules start)
      await this.applyCardOrder();
      this.setupCardDragDrop();

      // Initialize every enabled module concurrently
      await this.initializeEnabledModules();

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

  // ---------------- Card drag & drop (reorder dashboard widgets) ----------------

  /** Inject a grip handle into every widget header and wire drag events */
  setupCardDragDrop() {
    const grid = document.querySelector(".dashboard-grid");
    if (!grid) return;

    const gripSvg =
      '<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">' +
      '<circle cx="2.5" cy="2" r="1.4"/><circle cx="7.5" cy="2" r="1.4"/>' +
      '<circle cx="2.5" cy="7" r="1.4"/><circle cx="7.5" cy="7" r="1.4"/>' +
      '<circle cx="2.5" cy="12" r="1.4"/><circle cx="7.5" cy="12" r="1.4"/>' +
      "</svg>";

    grid.querySelectorAll(".widget").forEach((card) => {
      const hd = card.querySelector(".hd");
      if (!hd || hd.querySelector(".drag-handle")) return;

      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.title = "جابه‌جایی کارت";
      handle.innerHTML = gripSvg;
      hd.insertBefore(handle, hd.firstChild);

      // Only enable native dragging while the user grabs the handle,
      // so text selection / inputs inside cards keep working normally.
      safeAddEventListener(handle, "mousedown", () => {
        card.draggable = true;
      });
      safeAddEventListener(handle, "touchstart", () => {
        card.draggable = true;
      });
      safeAddEventListener(card, "dragend", () => {
        card.draggable = false;
      });
    });

    safeAddEventListener(grid, "dragstart", (e) => {
      const card = e.target.closest(".widget");
      if (!card || !card.draggable) return;
      this._draggingCard = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.module || "");
    });

    safeAddEventListener(grid, "dragover", (e) => {
      if (!this._draggingCard) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const after = this._getDragAfterElement(grid, e.clientX, e.clientY);
      if (after == null) grid.appendChild(this._draggingCard);
      else if (after !== this._draggingCard) grid.insertBefore(this._draggingCard, after);
    });

    safeAddEventListener(grid, "drop", (e) => {
      if (this._draggingCard) e.preventDefault();
    });

    safeAddEventListener(grid, "dragend", () => {
      if (!this._draggingCard) return;
      this._draggingCard.classList.remove("dragging");
      this._draggingCard = null;
      this.saveCardOrder();
    });
  }

  /** Nearest card to the cursor — works with RTL and multi-row grids */
  _getDragAfterElement(container, x, y) {
    const cards = [...container.querySelectorAll(".widget:not(.dragging)")];
    let closest = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const card of cards) {
      const box = card.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
      }
    }
    return closest;
  }

  async saveCardOrder() {
    try {
      const grid = document.querySelector(".dashboard-grid");
      if (!grid) return;
      const order = [...grid.querySelectorAll(".widget")].map(
        (el) => el.dataset.module
      );
      await storage.set({ cardOrder: order });
    } catch (error) {
      console.warn("Failed to save card order:", error);
    }
  }

  async applyCardOrder() {
    try {
      const result = await storage.get("cardOrder");
      const order = result.cardOrder;
      if (!Array.isArray(order) || !order.length) return;

      const grid = document.querySelector(".dashboard-grid");
      if (!grid) return;

      const cards = [...grid.querySelectorAll(".widget")];
      // append saved order first, then anything not stored (new modules)
      order.forEach((id) => {
        const card = cards.find((c) => c.dataset.module === id);
        if (card) grid.appendChild(card);
      });
    } catch (error) {
      console.warn("Failed to apply card order:", error);
    }
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
