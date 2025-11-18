/**
 * Sticky Notes Manager Module
 * Handles sticky notes with drag & drop functionality
 */
import { getElement, safeAddEventListener } from '../utils/dom.js';
import { StorageManager } from '../utils/storage.js';

export class StickyNotesManager {
  constructor() {
    this.storage = new StorageManager();
    this.stickyNotes = [];
    this.currentNote = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  async initialize() {
    try {
      await this.loadStickyNotes();
      this.setupEventListeners();
      this.renderStickyNotes();
      console.log('Sticky Notes module initialized');
    } catch (error) {
      console.error('Failed to initialize sticky notes module:', error);
    }
  }

  async loadStickyNotes() {
    const result = await this.storage.get('stickyNotes');
    this.stickyNotes = result.stickyNotes || [];
    
    // Initialize default positions if not set
    this.stickyNotes.forEach(note => {
      if (!note.x || !note.y) {
        note.x = Math.random() * (window.innerWidth - 300);
        note.y = Math.random() * (window.innerHeight - 300);
      }
    });
  }

  async saveStickyNotes() {
    await this.storage.set('stickyNotes', this.stickyNotes);
  }

  setupEventListeners() {
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

    // Handle window resize
    safeAddEventListener(window, 'resize', () => this.handleResize());
  }

  addStickyNote() {
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
    this.saveStickyNotes();
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
      <textarea class="sticky-note-content" placeholder="یادداشت خود را اینجا بنویسید...">${this.escapeHtml(note.content)}</textarea>
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

    // Delete button
    const deleteBtn = noteElement.querySelector('.sticky-note-delete-btn');
    safeAddEventListener(deleteBtn, 'click', () => {
      this.deleteStickyNote(note.id);
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
      isDragging = true;
      this.isDragging = true;
      
      startX = e.clientX;
      startY = e.clientY;
      initialX = parseInt(element.style.left) || 0;
      initialY = parseInt(element.style.top) || 0;

      element.style.cursor = 'grabbing';
      
      safeAddEventListener(document, 'mousemove', onMouseMove);
      safeAddEventListener(document, 'mouseup', onMouseUp);
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

  deleteStickyNote(noteId) {
    if (confirm('آیا از حذف این یادداشت مطمئن هستید؟')) {
      this.stickyNotes = this.stickyNotes.filter(note => note.id !== noteId);
      this.saveStickyNotes();
      
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
    this.stickyNotes.forEach(note => {
      note.x = Math.min(note.x, window.innerWidth - note.width);
      note.y = Math.min(note.y, window.innerHeight - note.height);
    });
    this.renderStickyNotes();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
