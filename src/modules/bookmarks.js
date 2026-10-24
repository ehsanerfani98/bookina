/**
 * Bookmarks Module — folder-based bookmarks grid
 * Each folder has a color and a list of links. Clicking a folder opens
 * a modal with its links (open / edit / delete) + add-link action.
 */

import {
  getElement,
  createElement,
  clearChildren,
  safeAddEventListener,
  toggleModal,
  showNotification,
  confirmDialog,
  escapeHtml,
  getFaviconUrl,
  normalizeUrl,
} from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber } from "../utils/date.js";

const FOLDER_COLORS = ["#5b7bff", "#a855f7", "#17c08b", "#f5a524", "#ec4899", "#f0516d"];

/** First-run seed — mirrors the system-design mockup */
const SEED_FOLDERS = [
  {
    name: "شبکه‌های اجتماعی", color: "#5b7bff",
    links: [
      { title: "اینستاگرام", url: "https://instagram.com" },
      { title: "تلگرام", url: "https://web.telegram.org" },
    ],
  },
  {
    name: "طراحی", color: "#a855f7",
    links: [
      { title: "دریببل", url: "https://dribbble.com" },
      { title: "بیهنس", url: "https://behance.net" },
    ],
  },
  {
    name: "هوش مصنوعی", color: "#17c08b",
    links: [
      { title: "چت‌جی‌پی‌تی", url: "https://chat.openai.com" },
      { title: "کلود", url: "https://claude.ai" },
      { title: "دیپ‌سیک", url: "https://chat.deepseek.com" },
    ],
  },
  {
    name: "کار", color: "#f5a524",
    links: [
      { title: "گیت‌هاب", url: "https://github.com" },
      { title: "جاب‌ویژن", url: "https://jobvision.ir" },
    ],
  },
  {
    name: "خدمات گوگل", color: "#4f6bff",
    links: [
      { title: "جیمیل", url: "https://mail.google.com" },
      { title: "کلندر", url: "https://calendar.google.com" },
    ],
  },
  {
    name: "سرگرمی", color: "#ec4899",
    links: [
      { title: "آپارات", url: "https://www.aparat.com" },
      { title: "یوتیوب", url: "https://youtube.com" },
    ],
  },
  {
    name: "خرید", color: "#f0516d",
    links: [
      { title: "دیجی‌کالا", url: "https://www.digikala.com" },
      { title: "ترب", url: "https://torob.com" },
    ],
  },
];

export class BookmarksManager {
  constructor() {
    this.folders = [];

    this.grid = getElement("foldersGrid");
    this.addFolderBtn = getElement("addFolder");
    this.foldersCount = getElement("foldersCount");

    this.folderModal = getElement("folderModal");
    this.folderModalTitle = getElement("folderModalTitle");
    this.folderLinks = getElement("folderLinks");
    this.addLinkBtn = getElement("addLinkToFolder");

    this.folderFormModal = getElement("folderFormModal");
    this.folderForm = getElement("folderForm");
    this.folderNameInput = getElement("folderName");
    this.folderColorsWrap = getElement("folderColors");
    this.folderFormTitle = getElement("folderFormTitle");

    this.linkModal = getElement("linkModal");
    this.linkForm = getElement("linkForm");
    this.linkTitleInput = getElement("linkTitle");
    this.linkUrlInput = getElement("linkUrl");
    this.linkModalTitle = getElement("linkModalTitle");

    this.activeFolderId = null;
    this.editingLinkId = null;
    this.editingFolderId = null;
    this.selectedColor = FOLDER_COLORS[0];
  }

  async initialize() {
    await this.loadFolders();
    this.setupEventListeners();
    this.renderFolders();
    console.log("Bookmarks module initialized");
  }

  // ---------------- data ----------------

  async loadFolders() {
    const result = await storage.get(["bookmarkFolders", "bookmarks", "bookinaSeeded"]);
    this.folders = result.bookmarkFolders || [];

    if (this.folders.length === 0 && Array.isArray(result.bookmarks) && result.bookmarks.length) {
      // migrate old flat bookmarks into a default folder
      this.folders = [
        {
          id: `folder_${Date.now()}`,
          name: "عمومی",
          color: FOLDER_COLORS[0],
          links: result.bookmarks.map((b) => ({
            id: b.id || `link_${Date.now()}_${Math.random()}`,
            title: b.title || "",
            url: b.url || "",
            favicon: b.favicon || getFaviconUrl(b.url),
          })),
        },
      ];
      await this.saveFolders();
    } else if (this.folders.length === 0 && !result.bookinaSeeded) {
      // first run — seed default folders
      this.folders = SEED_FOLDERS.map((f, i) => ({
        id: `folder_${Date.now()}_${i}`,
        name: f.name,
        color: f.color,
        links: f.links.map((l) => ({
          id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: l.title,
          url: l.url,
          favicon: getFaviconUrl(l.url),
        })),
      }));
      await this.saveFolders();
    }

    await storage.set({ bookinaSeeded: true });
  }

  async saveFolders() {
    await storage.set({ bookmarkFolders: this.folders });
  }

  getFolder(id) {
    return this.folders.find((f) => f.id === id);
  }

  // ---------------- events ----------------

  setupEventListeners() {
    safeAddEventListener(this.addFolderBtn, "click", () => this.showFolderForm());
    safeAddEventListener(this.addLinkBtn, "click", () => this.showLinkForm());

    safeAddEventListener(this.folderForm, "submit", (e) => this.handleFolderSubmit(e));
    safeAddEventListener(this.linkForm, "submit", (e) => this.handleLinkSubmit(e));

    // folder color dots
    if (this.folderColorsWrap) {
      this.folderColorsWrap.innerHTML = "";
      FOLDER_COLORS.forEach((c, i) => {
        const dot = createElement("div", { className: `color-dot${i === 0 ? " sel" : ""}` });
        dot.style.background = c;
        dot.dataset.color = c;
        safeAddEventListener(dot, "click", () => {
          this.selectedColor = c;
          this.folderColorsWrap.querySelectorAll(".color-dot").forEach((d) => d.classList.remove("sel"));
          dot.classList.add("sel");
        });
        this.folderColorsWrap.appendChild(dot);
      });
    }
  }

  // ---------------- folder grid ----------------

  renderFolders() {
    if (!this.grid) return;
    clearChildren(this.grid);

    const totalLinks = this.folders.reduce((s, f) => s + f.links.length, 0);
    if (this.foldersCount) {
      this.foldersCount.textContent = `${toPersianNumber(this.folders.length)} پوشه · ${toPersianNumber(totalLinks)} لینک`;
    }

    this.folders.forEach((folder) => {
      const card = createElement("div", { className: "folder" });
      card.style.setProperty("--c", folder.color);

      const lines = createElement("div", { className: "stack-lines" });
      for (let i = 0; i < 6; i++) lines.appendChild(document.createElement("i"));
      card.appendChild(lines);

      const name = createElement("span", { className: "fname" }, folder.name);
      const count = createElement(
        "span",
        { className: "fcount" },
        `${toPersianNumber(folder.links.length)} لینک`
      );
      card.appendChild(name);
      card.appendChild(count);

      const actions = createElement("div", { className: "factions" });
      const editBtn = createElement("button", { title: "ویرایش پوشه" }, "✎");
      const delBtn = createElement("button", { className: "del", title: "حذف پوشه" }, "🗑");
      safeAddEventListener(editBtn, "click", (e) => {
        e.stopPropagation();
        this.showFolderForm(folder);
      });
      safeAddEventListener(delBtn, "click", (e) => {
        e.stopPropagation();
        this.deleteFolder(folder);
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      safeAddEventListener(card, "click", () => this.openFolder(folder));

      this.grid.appendChild(card);
    });

    // add-folder card
    const add = createElement("div", { className: "folder add-folder" });
    add.appendChild(createElement("span", { className: "plus" }, "+"));
    add.appendChild(createElement("span", {}, "پوشه جدید"));
    safeAddEventListener(add, "click", () => this.showFolderForm());
    this.grid.appendChild(add);
  }

  async openFolder(folder) {
    this.activeFolderId = folder.id;
    if (this.folderModalTitle) this.folderModalTitle.textContent = folder.name;
    this.renderFolderLinks();
    toggleModal(this.folderModal, true);
  }

  renderFolderLinks() {
    const folder = this.getFolder(this.activeFolderId);
    if (!folder || !this.folderLinks) return;
    clearChildren(this.folderLinks);

    if (folder.links.length === 0) {
      this.folderLinks.appendChild(
        createElement("div", { className: "empty-sm" }, "این پوشه خالی است")
      );
      return;
    }

    folder.links.forEach((link) => {
      const row = createElement("div", { className: "link-row" });

      const img = createElement("img", { src: link.favicon || getFaviconUrl(link.url), alt: "" });
      safeAddEventListener(img, "error", () => {
        img.style.visibility = "hidden";
      });

      const title = createElement("span", { className: "lt" }, link.title);
      const acts = createElement("div", { className: "lacts" });
      const editBtn = createElement("button", { title: "ویرایش" }, "✎");
      const delBtn = createElement("button", { className: "del", title: "حذف" }, "🗑");

      safeAddEventListener(editBtn, "click", (e) => {
        e.stopPropagation();
        this.showLinkForm(link);
      });
      safeAddEventListener(delBtn, "click", async (e) => {
        e.stopPropagation();
        const confirmed = await confirmDialog(`لینک «${link.title}» حذف شود؟`);
        if (!confirmed) return;
        folder.links = folder.links.filter((l) => l.id !== link.id);
        await this.saveFolders();
        this.renderFolderLinks();
        this.renderFolders();
      });

      acts.appendChild(editBtn);
      acts.appendChild(delBtn);
      row.appendChild(img);
      row.appendChild(title);
      row.appendChild(acts);

      safeAddEventListener(row, "click", (e) => {
        if (e.target.closest(".lacts")) return;
        if (!link.url) return;
        window.location.href = link.url;
      });

      this.folderLinks.appendChild(row);
    });
  }

  // ---------------- folder form ----------------

  showFolderForm(folder = null) {
    this.editingFolderId = folder?.id || null;
    if (this.folderFormTitle) {
      this.folderFormTitle.textContent = folder ? "ویرایش پوشه" : "پوشه جدید";
    }
    if (this.folderNameInput) this.folderNameInput.value = folder?.name || "";
    this.selectedColor = folder?.color || FOLDER_COLORS[0];
    this.folderColorsWrap?.querySelectorAll(".color-dot").forEach((d) => {
      d.classList.toggle("sel", d.dataset.color === this.selectedColor);
    });
    toggleModal(this.folderFormModal, true);
    setTimeout(() => this.folderNameInput?.focus(), 50);
  }

  async handleFolderSubmit(e) {
    e.preventDefault();
    const name = (this.folderNameInput?.value || "").trim();
    if (!name) return;

    if (this.editingFolderId) {
      const folder = this.getFolder(this.editingFolderId);
      if (folder) {
        folder.name = name;
        folder.color = this.selectedColor;
      }
    } else {
      this.folders.push({
        id: `folder_${Date.now()}`,
        name,
        color: this.selectedColor,
        links: [],
      });
    }

    await this.saveFolders();
    this.renderFolders();
    toggleModal(this.folderFormModal, false);
  }

  async deleteFolder(folder) {
    const confirmed = await confirmDialog(
      `پوشه «${folder.name}» با ${toPersianNumber(folder.links.length)} لینک حذف شود؟`
    );
    if (!confirmed) return;
    this.folders = this.folders.filter((f) => f.id !== folder.id);
    await this.saveFolders();
    this.renderFolders();
    showNotification("پوشه حذف شد", "info");
  }

  // ---------------- link form ----------------

  showLinkForm(link = null) {
    if (!this.activeFolderId) return;
    this.editingLinkId = link?.id || null;
    if (this.linkModalTitle) {
      this.linkModalTitle.textContent = link ? "ویرایش لینک" : "لینک جدید";
    }
    if (this.linkTitleInput) this.linkTitleInput.value = link?.title || "";
    if (this.linkUrlInput) this.linkUrlInput.value = link?.url || "";
    toggleModal(this.linkModal, true);
    setTimeout(() => this.linkTitleInput?.focus(), 50);
  }

  async handleLinkSubmit(e) {
    e.preventDefault();
    const folder = this.getFolder(this.activeFolderId);
    if (!folder) return;

    const title = (this.linkTitleInput?.value || "").trim();
    const url = normalizeUrl(this.linkUrlInput?.value);
    if (!title || !url) return;

    if (this.editingLinkId) {
      const link = folder.links.find((l) => l.id === this.editingLinkId);
      if (link) {
        link.title = title;
        link.url = url;
        link.favicon = getFaviconUrl(url);
      }
    } else {
      folder.links.push({
        id: `link_${Date.now()}`,
        title,
        url,
        favicon: getFaviconUrl(url),
      });
    }

    await this.saveFolders();
    this.renderFolderLinks();
    this.renderFolders();
    toggleModal(this.linkModal, false);
  }

  // ---------------- misc ----------------

  async refresh() {
    await this.loadFolders();
    this.renderFolders();
  }

  async saveState() {
    await this.saveFolders();
  }
}
