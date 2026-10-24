/**
 * Quick Note Module — single auto-saved note with title, body and char counter
 */

import { getElement, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber } from "../utils/date.js";
import { debounce } from "../utils/dom.js";

export class QuickNoteManager {
  constructor() {
    this.titleInput = getElement("qnTitle");
    this.bodyInput = getElement("qnBody");
    this.countEl = getElement("qnCount");
  }

  async initialize() {
    const result = await storage.get("quickNote");
    const note = result.quickNote || { title: "", body: "" };

    if (this.titleInput) this.titleInput.value = note.title || "";
    if (this.bodyInput) this.bodyInput.value = note.body || "";
    this.renderCount();

    const save = debounce(() => this.save(), 400);
    safeAddEventListener(this.titleInput, "input", save);
    safeAddEventListener(this.bodyInput, "input", () => {
      this.renderCount();
      save();
    });

    console.log("QuickNote module initialized");
  }

  renderCount() {
    if (!this.countEl || !this.bodyInput) return;
    this.countEl.textContent = `${toPersianNumber(this.bodyInput.value.length)} کاراکتر`;
  }

  async save() {
    await storage.set({
      quickNote: {
        title: this.titleInput?.value || "",
        body: this.bodyInput?.value || "",
        updated: Date.now(),
      },
    });
  }

  async refresh() {
    /* nothing to refresh */
  }

  async saveState() {
    await this.save();
  }
}
