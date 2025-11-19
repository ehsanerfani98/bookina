/**
 * Todos Module - Manage todo list with status tracking
 */

import { storage } from '../utils/storage.js';
import { getElement, createElement, clearChildren, safeAddEventListener } from '../utils/dom.js';

export class TodosManager {
  constructor() {
    this.todos = [];

    // DOM Elements
    this.container = getElement('todoList');
    this.input = getElement('todoInput');
    this.addBtn = getElement('addTodo');

    this.initialize();
  }

  async initialize() {
    await this.loadTodos();
    this.setupEventListeners();
  }

  async loadTodos() {
    const result = await storage.get('todos');
    this.todos = result.todos || [];
    this.renderTodos();
  }

  async saveTodos() {
    await storage.set({ todos: this.todos });
  }

  setupEventListeners() {
    safeAddEventListener(this.addBtn, 'click', () => this.handleAddTodo());
    safeAddEventListener(this.input, 'keypress', (e) => {
      if (e.key === 'Enter') this.handleAddTodo();
    });
  }

  renderTodos() {
    clearChildren(this.container);

    this.todos.forEach((todo, index) => {
      this.createTodoElement(todo, index);
    });
  }

  createTodoElement(todo, index) {
    const li = createElement('li', {
      className: `todo-item ${todo.status}`
    });

    li.innerHTML = `
      <span data-index="${index}">${todo.text}</span>
      <div class="todo-actions">
        <select data-index="${index}">
          <option value="pending" ${todo.status === 'pending' ? 'selected' : ''}>انجام نشده</option>
          <option value="inprogress" ${todo.status === 'inprogress' ? 'selected' : ''}>در حال انجام</option>
          <option value="done" ${todo.status === 'done' ? 'selected' : ''}>انجام شده</option>
        </select>
        <button data-index="${index}">&times;</button>
      </div>
    `;

    // Status change
    const select = li.querySelector('select');
    safeAddEventListener(select, 'change', (e) => {
      this.todos[index].status = e.target.value;
      this.saveTodos();
      this.renderTodos();
    });

    // Delete
    const deleteBtn = li.querySelector('button');
    safeAddEventListener(deleteBtn, 'click', () => {
      this.todos.splice(index, 1);
      this.saveTodos();
      this.renderTodos();
    });

    this.container.appendChild(li);
  }

  async handleAddTodo() {
    const text = this.input.value.trim();
    if (!text) return;

    this.todos.push({
      text,
      status: 'pending'
    });

    this.input.value = '';
    await this.saveTodos();
    this.renderTodos();
  }

  // Public API
  getTodos() {
    return [...this.todos];
  }

  addTodo(text, status = 'pending') {
    this.todos.push({ text, status });
    return this.saveTodos().then(() => this.renderTodos());
  }

  removeTodo(index) {
    this.todos.splice(index, 1);
    return this.saveTodos().then(() => this.renderTodos());
  }

  updateTodoStatus(index, status) {
    if (this.todos[index]) {
      this.todos[index].status = status;
      return this.saveTodos().then(() => this.renderTodos());
    }
  }

  async refresh() {
    await this.loadTodos();
  }

  async saveState() {
    await this.saveTodos();
  }
}
