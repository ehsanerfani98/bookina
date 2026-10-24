/**
 * Settings Manager Module
 * Handles app settings: module on/off toggles, appearance (background), backup/restore
 */

import { getElement, safeAddEventListener, showNotification, toggleModal, confirmDialog } from "../utils/dom.js";
import { StorageManager } from "../utils/storage.js";

/** Catalog of toggleable modules shown in settings */
export const MODULE_INFO = [
  { id: "search", name: "جست‌وجو", desc: "نوار جست‌وجوی بالای صفحه" },
  { id: "clock", name: "ساعت و تاریخ", desc: "کارت ساعت، تاریخ شمسی/میلادی/قمری" },
  { id: "calendar", name: "تقویم", desc: "تقویم شمسی با ناوبری ماه‌ها" },
  { id: "habits", name: "عادت‌ها", desc: "پیگیری عادت‌های هفتگی" },
  { id: "tasks", name: "تسک‌ها", desc: "لیست کارهای روزانه" },
  { id: "pomodoro", name: "پومودورو", desc: "تایمر کار و استراحت" },
  { id: "quicknote", name: "یادداشت سریع", desc: "یادداشت متنی در داشبورد" },
  { id: "rates", name: "ارز و طلا", desc: "نرخ دلار، یورو و طلای ۱۸ عیار" },
  { id: "bookmarks", name: "بوکمارک‌ها", desc: "پوشه‌های لینک‌های پرکاربرد" },
  { id: "news", name: "اخبار", desc: "تازه‌ترین خبرهای زیومیت" },
  { id: "weather", name: "آب‌وهوا", desc: "وضعیت هوا و جزئیات کامل" },
  { id: "notes", name: "یادداشت‌های چسبان", desc: "تب یادداشت‌های رنگی سراگرد" },
];

export class SettingsManager {
  constructor() {
    this.storage = new StorageManager();
    this.settings = {};
    this.availableBackgrounds = [
      "bg1.jpg", "bg2.jpg", "bg3.jpg", "bg4.jpg",
      "bg5.jpg", "bg6.jpg", "bg7.jpg", "bg8.jpg",
    ];
  }

  async initialize() {
    await this.loadSettings();
    this.normalizeSettings();
    this.setupEventListeners();
    this.buildModuleToggles();
    this.buildBackgroundThumbs();
    this.applyBackground();
    this.applyModuleVisibility();
  }

  getDefaultSettings() {
    const modules = {};
    MODULE_INFO.forEach((m) => (modules[m.id] = true));
    return {
      background: "default",
      customBackground: null,
      modules,
    };
  }

  async loadSettings() {
    const result = await this.storage.get("appSettings");
    this.settings = result.appSettings || this.getDefaultSettings();
  }

  /** Merge defaults for settings saved by older versions */
  normalizeSettings() {
    const def = this.getDefaultSettings();
    this.settings = {
      ...def,
      ...this.settings,
      modules: { ...def.modules, ...(this.settings.modules || {}) },
    };
  }

  async saveSettings() {
    try {
      await this.storage.set({ appSettings: this.settings });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  isModuleEnabled(id) {
    return this.settings.modules[id] !== false;
  }

  async setModuleEnabled(id, enabled) {
    this.settings.modules[id] = !!enabled;
    await this.saveSettings();
    if (window.bookinaApp) {
      window.bookinaApp.applyModuleEnabled(id, !!enabled);
    }
  }

  /** Show/hide module widgets according to settings (called before modules init) */
  applyModuleVisibility() {
    MODULE_INFO.forEach((m) => {
      this._applyVisibility(m.id, this.isModuleEnabled(m.id));
    });
  }

  _applyVisibility(id, enabled) {
    if (id === "notes") {
      const btn = getElement("notesTabBtn");
      if (btn) btn.classList.toggle("mod-off", !enabled);
      return;
    }
    const el = document.querySelector(`[data-module="${id}"]`);
    if (el) el.classList.toggle("mod-off", !enabled);
  }

  // ---------------- UI construction ----------------

  buildModuleToggles() {
    const wrap = getElement("moduleToggles");
    if (!wrap) return;
    wrap.innerHTML = "";

    MODULE_INFO.forEach((m) => {
      const row = document.createElement("div");
      row.className = "toggle-row";

      const text = document.createElement("div");
      const b = document.createElement("b");
      b.textContent = m.name;
      const p = document.createElement("p");
      p.className = "sm";
      p.textContent = m.desc;
      text.appendChild(b);
      text.appendChild(p);

      const label = document.createElement("label");
      label.className = "switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = this.isModuleEnabled(m.id);
      input.dataset.moduleId = m.id;
      const slider = document.createElement("span");
      label.appendChild(input);
      label.appendChild(slider);

      safeAddEventListener(input, "change", () => {
        this.setModuleEnabled(m.id, input.checked);
      });

      row.appendChild(text);
      row.appendChild(label);
      wrap.appendChild(row);
    });
  }

  buildBackgroundThumbs() {
    const container = getElement("backgrounds");
    if (!container) return;
    container.innerHTML = "";

    // "default" gradient option
    const defThumb = document.createElement("div");
    defThumb.className = "bg-thumb bg-default";
    defThumb.dataset.bg = "default";
    defThumb.textContent = "پیش‌فرض";
    safeAddEventListener(defThumb, "click", () => this.changeBackground("default"));
    container.appendChild(defThumb);

    this.availableBackgrounds.forEach((img) => {
      const thumb = document.createElement("div");
      thumb.className = "bg-thumb";
      thumb.style.backgroundImage = `url('images/${img}')`;
      thumb.dataset.bg = img;
      safeAddEventListener(thumb, "click", () => this.changeBackground(img));
      container.appendChild(thumb);
    });

    this.updateSettingsDisplay();
  }

  setupEventListeners() {
    const settingsBtn = getElement("settingsBtn");
    const settingModal = getElement("settingModal");
    const exportBtn = getElement("exportBackup");
    const importBtn = getElement("importBackup");
    const importFile = getElement("importFile");
    const uploadBackgroundBtn = getElement("uploadBackgroundBtn");
    const backgroundUpload = getElement("backgroundUpload");
    const removeCustomBackgroundBtn = getElement("removeCustomBackgroundBtn");
    const resetBtn = getElement("resetSettings");

    safeAddEventListener(settingsBtn, "click", () => this.showSettings());

    safeAddEventListener(settingModal, "click", (e) => {
      if (e.target === settingModal) this.hideSettings();
    });

    // settings section tabs
    document.querySelectorAll(".settings-tabs button").forEach((btn) => {
      safeAddEventListener(btn, "click", () => {
        document
          .querySelectorAll(".settings-tabs button")
          .forEach((x) => x.classList.remove("on"));
        btn.classList.add("on");
        const sec = btn.dataset.sec;
        document.querySelectorAll(".settings-sec").forEach((s) => {
          s.hidden = s.id !== `sec-${sec}`;
        });
      });
    });

    safeAddEventListener(exportBtn, "click", () => this.exportBackup());
    safeAddEventListener(importBtn, "click", () => importFile?.click());
    safeAddEventListener(importFile, "change", (e) => this.importBackup(e));
    safeAddEventListener(resetBtn, "click", () => this.handleReset());

    // custom background
    safeAddEventListener(uploadBackgroundBtn, "click", () => backgroundUpload?.click());
    safeAddEventListener(backgroundUpload, "change", (e) => this.handleBackgroundUpload(e));
    safeAddEventListener(removeCustomBackgroundBtn, "click", () => this.removeCustomBackground());
  }

  showSettings() {
    toggleModal("settingModal", true);
    this.updateSettingsDisplay();
  }

  hideSettings() {
    toggleModal("settingModal", false);
  }

  updateSettingsDisplay() {
    document.querySelectorAll(".bg-thumb").forEach((thumb) => {
      const isCustom = !!this.settings.customBackground;
      thumb.classList.toggle(
        "selected",
        !isCustom && thumb.dataset.bg === this.settings.background
      );
    });
    this.updateCustomBackgroundUI();
  }

  // ---------------- Appearance ----------------

  changeBackground(backgroundImage) {
    this.settings.background = backgroundImage;
    this.settings.customBackground = null;
    this.saveSettings();
    this.applyBackground();
    this.updateSettingsDisplay();
  }

  applyBackground() {
    const body = document.body;
    if (this.settings.customBackground) {
      body.style.backgroundImage = `url(${this.settings.customBackground})`;
      body.classList.add("bg-image");
    } else if (this.settings.background && this.settings.background !== "default") {
      body.style.backgroundImage = `url('images/${this.settings.background}')`;
      body.classList.add("bg-image");
    } else {
      body.style.backgroundImage = "";
      body.classList.remove("bg-image");
    }
  }

  handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification("لطفاً یک فایل تصویری انتخاب کنید", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification("حجم فایل نباید بیشتر از ۵ مگابایت باشد", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        this.settings.customBackground = e.target.result;
        this.saveSettings();
        this.applyBackground();
        this.updateSettingsDisplay();
        showNotification("پس‌زمینه سفارشی با موفقیت اعمال شد ✅", "success");
      } catch (error) {
        console.error("Error processing background image:", error);
        showNotification("خطا در پردازش تصویر ❌", "error");
      }
    };
    reader.onerror = () => showNotification("خطا در خواندن فایل ❌", "error");
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  removeCustomBackground() {
    this.settings.customBackground = null;
    this.saveSettings();
    this.applyBackground();
    this.updateSettingsDisplay();
    showNotification("پس‌زمینه سفارشی حذف شد", "info");
  }

  updateCustomBackgroundUI() {
    const btn = getElement("removeCustomBackgroundBtn");
    if (btn) btn.hidden = !this.settings.customBackground;
  }

  // ---------------- Backup ----------------

  async exportBackup() {
    try {
      const keys = [
        "bookmarkFolders", "bookmarks", "todos", "habits",
        "stickyNotes", "quickNote", "weatherSettings", "cachedWeather",
        "cachedNews", "cachedRates", "searchEngine", "bookinaSeeded", "cardOrder",
      ];
      const data = await this.storage.get(keys);
      const backupData = {
        ...data,
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: "2.0.0",
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Bookina-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification("بکاپ با موفقیت ذخیره شد ✅", "success");
    } catch (error) {
      console.error("Export backup error:", error);
      showNotification("خطا در ذخیره بکاپ ❌", "error");
    }
  }

  async importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (!this.validateBackupData(backupData)) {
          throw new Error("invalid backup");
        }

        const restorePromises = [];
        const copyKeys = [
          "bookmarkFolders", "bookmarks", "todos", "habits", "stickyNotes",
          "quickNote", "weatherSettings", "cachedWeather", "cachedNews",
          "cachedRates", "searchEngine", "bookinaSeeded", "cardOrder",
        ];
        copyKeys.forEach((key) => {
          if (backupData[key] !== undefined) {
            restorePromises.push(this.storage.set({ [key]: backupData[key] }));
          }
        });

        if (backupData.settings) {
          this.settings = { ...this.getDefaultSettings(), ...backupData.settings };
          this.normalizeSettings();
          restorePromises.push(this.saveSettings());
        }

        await Promise.all(restorePromises);
        this.applyBackground();
        this.applyModuleVisibility();
        this.buildModuleToggles();
        this.updateSettingsDisplay();

        if (window.bookinaApp) {
          await window.bookinaApp.refreshAll();
        }

        showNotification("بکاپ با موفقیت بازیابی شد — در حال نوسازی… ✅", "success");
        setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("Import backup error:", error);
        showNotification("فایل بکاپ معتبر نیست ❌", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  validateBackupData(data) {
    return (
      data &&
      (Array.isArray(data.bookmarkFolders) ||
        Array.isArray(data.bookmarks) ||
        Array.isArray(data.todos) ||
        Array.isArray(data.habits) ||
        typeof data.settings === "object")
    );
  }

  async handleReset() {
    const confirmed = await confirmDialog(
      "تمام تنظیمات به حالت پیش‌فرض برمی‌گردد. داده‌های شما (بوکمارک‌ها، تسک‌ها و…) حذف نمی‌شود. ادامه می‌دهید؟",
      { danger: true, confirmText: "بازنشانی" }
    );
    if (!confirmed) return;

    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    this.applyBackground();
    this.applyModuleVisibility();
    this.buildModuleToggles();
    this.buildBackgroundThumbs();
    this.updateSettingsDisplay();
    showNotification("تنظیمات بازنشانی شد", "success");
  }

  async refresh() {
    await this.loadSettings();
    this.normalizeSettings();
    this.applyBackground();
    this.applyModuleVisibility();
  }

  async saveState() {
    await this.saveSettings();
  }
}
