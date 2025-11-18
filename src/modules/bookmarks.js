/**
 * Bookmarks Module - Manage and display bookmarks with drag & drop functionality
 */

import { storage } from '../utils/storage.js';
import { getElement, createElement, clearChildren, safeAddEventListener, getFaviconUrl, confirmDialog } from '../utils/dom.js';

export class BookmarksManager {
  constructor() {
    this.bookmarks = [];
    this.editingBookmarkId = null;
    this.draggedId = null;
    
    // DOM Elements
    this.container = getElement('bookmarksContainer');
    this.addBtn = getElement('addBookmark');
    this.modal = getElement('bookmarkModal');
    this.form = getElement('bookmarkForm');
    this.titleInput = getElement('title');
    this.urlInput = getElement('url');
    this.modalTitle = getElement('modalTitle');
    this.cancelBtn = getElement('cancelBtn');
    
    this.initialize();
  }

  async initialize() {
    await this.loadBookmarks();
    this.setupEventListeners();
  }

  async loadBookmarks() {
    const result = await storage.get('bookmarks');
    this.bookmarks = result.bookmarks || [];
    this.renderBookmarks();
  }

  async saveBookmarks() {
    await storage.set({ bookmarks: this.bookmarks });
  }

  setupEventListeners() {
    safeAddEventListener(this.addBtn, 'click', () => this.handleAdd());
    safeAddEventListener(this.cancelBtn, 'click', () => this.hideModal());
    safeAddEventListener(this.modal, 'click', (e) => {
      if (e.target === this.modal) this.hideModal();
    });
    
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  renderBookmarks() {
    clearChildren(this.container);

    if (this.bookmarks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2>No bookmarks yet</h2>
          <p>Click "Add New" to create your first bookmark</p>
        </div>
      `;
      return;
    }

    this.bookmarks.forEach(bookmark => {
      this.createBookmarkElement(bookmark);
    });
  }

  createBookmarkElement(bookmark) {
    const bookmarkCard = createElement('div', {
      className: 'bookmark-card',
      draggable: 'true',
      'data-id': bookmark.id
    });

    bookmarkCard.innerHTML = `
      <div class="bookmark-content" data-id="${bookmark.id}">
        <div class="favicon">
          <img src="${bookmark.favicon}" alt="favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M2 12c0-5.523 4.477-10 10-10s10 4.477 10 10"></path>
          </svg>
        </div>
        <div class="bookmark-info">
          <h3>${bookmark.title}</h3>
        </div>
      </div>
      <div class="bookmark-actions">
        <i class="fas fa-edit edit-btn" data-id="${bookmark.id}"></i>
        <i class="fas fa-trash delete-btn" data-id="${bookmark.id}"></i>
      </div>
    `;

    // Open link in new tab
    const content = bookmarkCard.querySelector('.bookmark-content');
    safeAddEventListener(content, 'click', (e) => {
      if (!e.target.closest('.bookmark-actions')) {
        window.location.href = bookmark.url;
      }
    });

    // Drag & drop events
    safeAddEventListener(bookmarkCard, 'dragstart', (e) => this.dragStart(e));
    safeAddEventListener(bookmarkCard, 'dragover', (e) => this.dragOver(e));
    safeAddEventListener(bookmarkCard, 'drop', (e) => this.drop(e));
    safeAddEventListener(bookmarkCard, 'dragend', (e) => this.dragEnd(e));

    // Edit and delete buttons
    const editBtn = bookmarkCard.querySelector('.edit-btn');
    const deleteBtn = bookmarkCard.querySelector('.delete-btn');
    
    safeAddEventListener(editBtn, 'click', (e) => this.handleEdit(e));
    safeAddEventListener(deleteBtn, 'click', (e) => this.handleDelete(e));

    this.container.appendChild(bookmarkCard);
  }

  // Drag & Drop Methods
  dragStart(e) {
    this.draggedId = e.currentTarget.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  }

  dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  drop(e) {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.id;
    if (this.draggedId === targetId) return;

    const draggedIndex = this.bookmarks.findIndex(b => b.id === this.draggedId);
    const targetIndex = this.bookmarks.findIndex(b => b.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = this.bookmarks.splice(draggedIndex, 1);
    this.bookmarks.splice(targetIndex, 0, draggedItem);

    this.saveBookmarks();
    this.renderBookmarks();
  }

  dragEnd(e) {
    e.currentTarget.style.opacity = '1';
    this.draggedId = null;
  }

  // Modal Methods
  showModal(title = 'اضافه کردن آدرس جدید') {
    this.modalTitle.textContent = title;
    this.modal.style.display = 'flex';
    this.titleInput.focus();
  }

  hideModal() {
    this.modal.style.display = 'none';
    this.form.reset();
    this.editingBookmarkId = null;
  }

  // Action Handlers
  handleAdd() {
    this.showModal();
  }

  handleEdit(e) {
    const id = e.target.dataset.id;
    const bookmark = this.bookmarks.find(b => b.id === id);

    if (bookmark) {
      this.editingBookmarkId = id;
      this.titleInput.value = bookmark.title;
      this.urlInput.value = bookmark.url;
      this.showModal('ویرایش نشانک');
    }
  }

  async handleDelete(e) {
    const id = e.target.dataset.id;
    
    const confirmed = await confirmDialog('آیا مطمئن هستید که می‌خواهید این نشانک را حذف کنید؟');
    if (confirmed) {
      this.bookmarks = this.bookmarks.filter(b => b.id !== id);
      await this.saveBookmarks();
      this.renderBookmarks();
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = this.titleInput.value.trim();
    const url = this.urlInput.value.trim();

    if (!title || !url) return;

    if (this.editingBookmarkId) {
      // Edit existing bookmark
      const index = this.bookmarks.findIndex(b => b.id === this.editingBookmarkId);
      if (index !== -1) {
        this.bookmarks[index] = {
          ...this.bookmarks[index],
          title,
          url,
          favicon: getFaviconUrl(url),
        };
        await this.saveBookmarks();
        this.renderBookmarks();
      }
    } else {
      // Add new bookmark
      const newBookmark = {
        id: Date.now().toString(),
        title,
        url,
        favicon: getFaviconUrl(url),
      };

      this.bookmarks.push(newBookmark);
      await this.saveBookmarks();
      this.renderBookmarks();
    }

    this.hideModal();
  }

  // Public API
  getBookmarks() {
    return [...this.bookmarks];
  }

  addBookmark(title, url) {
    const newBookmark = {
      id: Date.now().toString(),
      title,
      url,
      favicon: getFaviconUrl(url),
    };
    this.bookmarks.push(newBookmark);
    return this.saveBookmarks().then(() => this.renderBookmarks());
  }

  removeBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    return this.saveBookmarks().then(() => this.renderBookmarks());
  }
}
