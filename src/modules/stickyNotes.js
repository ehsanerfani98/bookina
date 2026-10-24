/**
 * Sticky Notes Module — draggable, resizable, colorable notes on the notes tab
 */

import { getElement, safeAddEventListener, confirmDialog, escapeHtml, showNotification } from "../utils/dom.js";
import { storage } from "../utils/storage.js";

const NOTE_COLORS = [
  "#ffe66d", "#ffc2c2", "#c4f1f9",
  "#d1fae5", "#e9d8fd", "#ffd8a8",
];

export class StickyNotesManager {
  constructor() {
    this.stickyNotes = [];
    this.currentNote = null;
    this.container = null;
  }

  async initialize() {
    await this.loadStickyNotes();
    this.setupEventListeners();
    this.renderStickyNotes();
  }

  async loadStickyNotes() {
    const result = await storage.get("stickyNotes");
    this.stickyNotes = result.stickyNotes || [];

    // sanitize positions & colors
    this.stickyNotes.forEach((note) => {
      if (note.x == null || isNaN(note.x)) note.x = 80;
      if (note.y == null || isNaN(note.y)) note.y = 80;
      if (!NOTE_COLORS.includes(note.color)) note.color = NOTE_COLORS[0];
      if (!note.width) note.width = 300;
      if (!note.height) note.height = 200;
      if (!note.zIndex) note.zIndex = 1000 + this.stickyNotes.indexOf(note);
    });
  }

  async saveStickyNotes() {
    await storage.set({ stickyNotes: this.stickyNotes });
  }

  setupEventListeners() {
    const addBtn = getElement("addStickyNote");
    const colorModal = getElement("stickyNoteModal");
    const colorsWrap = getElement("noteColors");

    safeAddEventListener(addBtn, "click", () => this.addStickyNote());

    safeAddEventListener(colorModal, "click", (e) => {
      if (e.target === colorModal) this.hideColorModal();
    });

    // build color dots
    if (colorsWrap) {
      colorsWrap.innerHTML = "";
      NOTE_COLORS.forEach((c) => {
        const dot = document.createElement("div");
        dot.className = "color-dot";
        dot.style.background = c;
        dot.dataset.color = c;
        safeAddEventListener(dot, "click", () => this.changeNoteColor(c));
        colorsWrap.appendChild(dot);
      });
    }
  }

  async addStickyNote() {
    const newNote = {
      id: "note_" + Date.now(),
      content: "",
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      x: Math.max(20, Math.min(window.innerWidth - 340, 60 + Math.random() * 120)),
      y: Math.max(20, 60 + Math.random() * 120),
      width: 300,
      height: 220,
      zIndex: 1000 + this.stickyNotes.length,
    };

    this.stickyNotes.push(newNote);
    await this.saveStickyNotes();
    this.createStickyNoteElement(newNote);
  }

  createStickyNoteElement(note) {
    this.container = getElement("stickyNotesContainer");
    if (!this.container) return;

    const el = document.createElement("div");
    el.className = "sticky-note";
    el.id = note.id;
    el.style.left = note.x + "px";
    el.style.top = note.y + "px";
    el.style.backgroundColor = note.color;
    el.style.width = note.width + "px";
    el.style.height = note.height + "px";
    el.style.zIndex = note.zIndex;

    el.innerHTML = `
      <div class="sticky-note-header">
        <div class="sticky-note-actions">
          <button class="sticky-note-color-btn" title="تغییر رنگ">🎨</button>
          <button class="sticky-note-delete-btn" title="حذف">🗑</button>
        </div>
      </div>
      <textarea class="sticky-note-content" placeholder="یادداشت خود را اینجا بنویسید…">${escapeHtml(note.content)}</textarea>
      <div class="rz" title="تغییر اندازه"></div>
    `;

    this.makeDraggable(el, note);
    this.makeResizable(el, note);
    this.setupNoteEventListeners(el, note);

    this.container.appendChild(el);
    return el;
  }

  setupNoteEventListeners(el, note) {
    const colorBtn = el.querySelector(".sticky-note-color-btn");
    safeAddEventListener(colorBtn, "click", () => {
      this.currentNote = note;
      getElement("stickyNoteModal")?.classList.add("open");
    });

    const deleteBtn = el.querySelector(".sticky-note-delete-btn");
    safeAddEventListener(deleteBtn, "click", async () => {
      try {
        await this.deleteStickyNote(note.id);
      } catch (error) {
        console.error("Error deleting sticky note:", error);
      }
    });

    const textarea = el.querySelector(".sticky-note-content");
    safeAddEventListener(textarea, "input", () => {
      note.content = textarea.value;
      this.saveStickyNotes();
    });

    safeAddEventListener(textarea, "focus", () => this.bringToFront(el, note));
    safeAddEventListener(el, "mousedown", () => this.bringToFront(el, note));
  }

  makeDraggable(el, note) {
    const header = el.querySelector(".sticky-note-header");
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const onMove = (e) => {
      if (!isDragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, initialX + (e.clientX - startX)));
      const newY = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, initialY + (e.clientY - startY)));
      el.style.left = newX + "px";
      el.style.top = newY + "px";
    };

    const onUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      note.x = parseInt(el.style.left);
      note.y = parseInt(el.style.top);
      this.saveStickyNotes();
    };

    safeAddEventListener(header, "mousedown", (e) => {
      if (e.target.closest("button")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = parseInt(el.style.left) || 0;
      initialY = parseInt(el.style.top) || 0;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  makeResizable(el, note) {
    const handle = el.querySelector(".rz");
    let isResizing = false;
    let startX, startY, startW, startH;

    const onMove = (e) => {
      if (!isResizing) return;
      // handle sits at bottom-left in RTL: dragging left grows, dragging up grows
      const w = Math.max(200, startW - (e.clientX - startX));
      const h = Math.max(140, startH - (e.clientY - startY));
      el.style.width = w + "px";
      el.style.height = h + "px";
    };

    const onUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      note.width = parseInt(el.style.width);
      note.height = parseInt(el.style.height);
      this.saveStickyNotes();
    };

    safeAddEventListener(handle, "mousedown", (e) => {
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = parseInt(el.style.width);
      startH = parseInt(el.style.height);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  bringToFront(el, note) {
    const highest = Math.max(...this.stickyNotes.map((n) => n.zIndex || 1000), 1000);
    if ((note.zIndex || 0) < highest) {
      note.zIndex = highest + 1;
      el.style.zIndex = note.zIndex;
      this.saveStickyNotes();
    }
  }

  hideColorModal() {
    getElement("stickyNoteModal")?.classList.remove("open");
    this.currentNote = null;
  }

  changeNoteColor(color) {
    if (!this.currentNote) return;
    this.currentNote.color = color;
    const el = document.getElementById(this.currentNote.id);
    if (el) el.style.backgroundColor = color;
    this.saveStickyNotes();
    this.hideColorModal();
  }

  async deleteStickyNote(noteId) {
    const confirmed = await confirmDialog("آیا از حذف این یادداشت مطمئن هستید؟");
    if (!confirmed) return;
    this.stickyNotes = this.stickyNotes.filter((note) => note.id !== noteId);
    await this.saveStickyNotes();
    document.getElementById(noteId)?.remove();
    showNotification("یادداشت حذف شد", "info");
  }

  renderStickyNotes() {
    this.container = getElement("stickyNotesContainer");
    if (!this.container) return;
    this.container.innerHTML = "";
    this.stickyNotes.forEach((note) => this.createStickyNoteElement(note));
  }

  handleResize() {
    let needsSave = false;
    this.stickyNotes.forEach((note) => {
      const clampedX = Math.min(note.x, Math.max(0, window.innerWidth - note.width));
      const clampedY = Math.min(note.y, Math.max(0, window.innerHeight - note.height));
      if (clampedX !== note.x || clampedY !== note.y) {
        note.x = clampedX;
        note.y = clampedY;
        needsSave = true;
        const el = document.getElementById(note.id);
        if (el) {
          el.style.left = clampedX + "px";
          el.style.top = clampedY + "px";
        }
      }
    });
    if (needsSave) this.saveStickyNotes();
  }

  async refresh() {
    await this.loadStickyNotes();
    this.renderStickyNotes();
  }

  async saveState() {
    await this.saveStickyNotes();
  }
}
