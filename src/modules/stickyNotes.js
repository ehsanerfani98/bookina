/**
 * Sticky Notes Manager Module
 * Handles sticky notes with drag & drop functionality
 */
import { getElement, safeAddEventListener, confirmDialog, escapeHtml } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';

export class StickyNotesManager {
  constructor() {
    this.storage = new StorageManager();
    this.stickyNotes = [];
    this.currentNote = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this._eventListenersSet = false;
  }

  async initialize() {
    try {
      await this.loadStickyNotes();
      this.setupEventListeners();
      this.renderStickyNotes();
    } catch (error) {
      console.error('Failed to initialize sticky notes module:', error);
    }
  }

  async loadStickyNotes() {
    const result = await this.storage.get('stickyNotes');
    this.stickyNotes = result.stickyNotes || [];

    // Initialize default positions only if not set (null/undefined check)
    this.stickyNotes.forEach(note => {
      if (note.x == null || note.y == null || isNaN(note.x) || isNaN(note.y)) {
        note.x = Math.max(0, Math.random() * (window.innerWidth - 300));
        note.y = Math.max(0, Math.random() * (window.innerHeight - 300));
      }
    });
  }

  async saveStickyNotes() {
    await this.storage.set({ stickyNotes: this.stickyNotes });
  }

  setupEventListeners() {
    // Prevent duplicate event listener setup
    if (this._eventListenersSet) {
      return;
    }

    const addStickyNoteBtn = getElement('addStickyNote');
    const stickyNoteModal = getElement('stickyNoteModal');
    const cancelColorBtn = getElement('cancelColorBtn');
    const colorOptions = document.querySelectorAll('.color-option');

    if (addStickyNoteBtn) {
      safeAddEventListener(addStickyNoteBtn, 'click', () => this.addStickyNote());
    }

    if (cancelColorBtn) {
      safeAddEventListener(cancelColorBtn, 'click', () => this.hideColorModal());
    }

    if (stickyNoteModal) {
      safeAddEventListener(stickyNoteModal, 'click', (e) => {
        if (e.target === stickyNoteModal) {
          this.hideColorModal();
        }
      });
    }

    // Color selection
    colorOptions.forEach(option => {
      safeAddEventListener(option, 'click', () => {
        this.changeNoteColor(option.getAttribute('data-color'));
      });
    });

    // Mark event listeners as set
    this._eventListenersSet = true;
  }

  async addStickyNote() {
    const newNote = {
      id: 'note_' + Date.now(),
      content: '',
      color: '#ffeb3b', // Default yellow
      x: Math.max(0, window.innerWidth - 370),
      y: Math.max(0, window.innerHeight / 2 - 150),
      width: 300,
      height: 200,
      zIndex: 1000 + this.stickyNotes.length
    };

    this.stickyNotes.push(newNote);
    await this.saveStickyNotes();
    this.createStickyNoteElement(newNote);
  }

  createStickyNoteElement(note) {
    const stickyNotesContainer = getElement('stickyNotesContainer');
    if (!stickyNotesContainer) return;

    const noteElement = document.createElement('div');
    noteElement.className = 'sticky-note';
    noteElement.id = note.id;
    noteElement.style.left = note.x + 'px';
    noteElement.style.top = note.y + 'px';
    noteElement.style.backgroundColor = note.color;
    noteElement.style.width = note.width + 'px';
    noteElement.style.height = note.height + 'px';
    noteElement.style.zIndex = note.zIndex;

    noteElement.innerHTML = `
      <div class="sticky-note-header">
        <div class="sticky-note-actions">
          <button class="sticky-note-color-btn" title="تغییر رنگ">
            <i class="fas fa-palette"></i>
          </button>
          <button class="sticky-note-delete-btn" title="حذف">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <textarea class="sticky-note-content" placeholder="یادداشت خود را اینجا بنویسید...">${escapeHtml(note.content)}</textarea>
    `;

    this.makeDraggable(noteElement);
    this.setupNoteEventListeners(noteElement, note);

    stickyNotesContainer.appendChild(noteElement);
    return noteElement;
  }

  setupNoteEventListeners(noteElement, note) {
    // Color button
    const colorBtn = noteElement.querySelector('.sticky-note-color-btn');
    safeAddEventListener(colorBtn, 'click', () => {
      this.currentNote = note;
      this.showColorModal();
    });

    // Delete button — properly await the async operation
    const deleteBtn = noteElement.querySelector('.sticky-note-delete-btn');
    safeAddEventListener(deleteBtn, 'click', async () => {
      try {
        await this.deleteStickyNote(note.id);
      } catch (error) {
        console.error('Error deleting sticky note:', error);
      }
    });

    // Content changes
    const textarea = noteElement.querySelector('.sticky-note-content');
    safeAddEventListener(textarea, 'input', () => {
      note.content = textarea.value;
      this.saveStickyNotes();
    });

    // Focus management for z-index
    safeAddEventListener(textarea, 'focus', () => {
      this.bringToFront(noteElement, note);
    });

    safeAddEventListener(noteElement, 'mousedown', () => {
      this.bringToFront(noteElement, note);
    });
  }

  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const header = element.querySelector('.sticky-note-header');

    safeAddEventListener(header, 'mousedown', (e) => {
      // Don't start drag if clicking on a button inside the header
      if (e.target.closest('button')) {
        return;
      }

      isDragging = true;
      this.isDragging = true;

      startX = e.clientX;
      startY = e.clientY;
      initialX = parseInt(element.style.left) || 0;
      initialY = parseInt(element.style.top) || 0;

      element.style.cursor = 'grabbing';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newX = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, initialX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, initialY + deltaY));

      element.style.left = newX + 'px';
      element.style.top = newY + 'px';
    };

    const onMouseUp = () => {
      isDragging = false;
      this.isDragging = false;
      element.style.cursor = 'grab';

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Save position
      const noteId = element.id;
      const note = this.stickyNotes.find(n => n.id === noteId);
      if (note) {
        note.x = parseInt(element.style.left);
        note.y = parseInt(element.style.top);
        this.saveStickyNotes();
      }
    };
  }

  bringToFront(element, note) {
    // Find highest z-index
    const highestZIndex = Math.max(...this.stickyNotes.map(n => n.zIndex), 1000);
    note.zIndex = highestZIndex + 1;
    element.style.zIndex = note.zIndex;
    this.saveStickyNotes();
  }

  showColorModal() {
    const stickyNoteModal = getElement('stickyNoteModal');
    if (stickyNoteModal) {
      stickyNoteModal.style.display = 'flex';
    }
  }

  hideColorModal() {
    const stickyNoteModal = getElement('stickyNoteModal');
    if (stickyNoteModal) {
      stickyNoteModal.style.display = 'none';
    }
    this.currentNote = null;
  }

  changeNoteColor(color) {
    if (this.currentNote) {
      this.currentNote.color = color;

      // Update color in DOM
      const noteElement = document.getElementById(this.currentNote.id);
      if (noteElement) {
        noteElement.style.backgroundColor = color;
      }

      this.saveStickyNotes();
      this.hideColorModal();
    }
  }

  async deleteStickyNote(noteId) {
    const confirmed = await confirmDialog('آیا از حذف این یادداشت مطمئن هستید؟');
    if (confirmed) {
      this.stickyNotes = this.stickyNotes.filter(note => note.id !== noteId);
      await this.saveStickyNotes();

      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        noteElement.remove();
      }
    }
  }

  renderStickyNotes() {
    const stickyNotesContainer = getElement('stickyNotesContainer');
    if (!stickyNotesContainer) return;

    stickyNotesContainer.innerHTML = '';
    this.stickyNotes.forEach(note => {
      this.createStickyNoteElement(note);
    });
  }

  handleResize() {
    // Ensure notes stay within bounds on window resize
    // IMPORTANT: Do NOT call renderStickyNotes() — that destroys all DOM elements,
    // loses textarea content/cursor position, and causes flickering.
    // Instead, only update the DOM elements whose positions actually changed.
    let needsSave = false;
    this.stickyNotes.forEach(note => {
      const clampedX = Math.min(note.x, Math.max(0, window.innerWidth - note.width));
      const clampedY = Math.min(note.y, Math.max(0, window.innerHeight - note.height));
      if (clampedX !== note.x || clampedY !== note.y) {
        note.x = clampedX;
        note.y = clampedY;
        needsSave = true;

        // Update only the affected note's DOM position directly
        const noteElement = document.getElementById(note.id);
        if (noteElement) {
          noteElement.style.left = clampedX + 'px';
          noteElement.style.top = clampedY + 'px';
        }
      }
    });

    if (needsSave) {
      this.saveStickyNotes();
    }
  }

  async saveState() {
    await this.saveStickyNotes();
  }

  async refresh() {
    await this.loadStickyNotes();
    this.renderStickyNotes();
  }

  // Public method to get notes count
  getNotesCount() {
    return this.stickyNotes.length;
  }

  // Public method to create note with specific content
  async createNote(content, color = '#ffeb3b') {
    const newNote = {
      id: 'note_' + Date.now(),
      content: content,
      color: color,
      x: Math.max(0, window.innerWidth - 370),
      y: Math.max(0, window.innerHeight / 2 - 150),
      width: 300,
      height: 200,
      zIndex: 1000 + this.stickyNotes.length
    };

    this.stickyNotes.push(newNote);
    await this.saveStickyNotes();
    this.createStickyNoteElement(newNote);
    return newNote;
  }
}
