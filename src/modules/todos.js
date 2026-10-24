/**
 * Todos Module — simple checkable task list with counter
 */

import { getElement, createElement, clearChildren, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber } from "../utils/date.js";

export class TodosManager {
  constructor() {
    this.todos = [];

    this.container = getElement("todoList");
    this.input = getElement("todoInput");
    this.addBtn = getElement("addTodo");
    this.inputRow = getElement("todoInputRow");
    this.countEl = getElement("tasksCount");
  }

  async initialize() {
    await this.loadTodos();
    this.setupEventListeners();
    this.renderTodos();
    console.log("Todos module initialized");
  }

  async loadTodos() {
    const result = await storage.get("todos");
    let todos = result.todos || [];

    // migrate old format {text, status} → {id, text, done}
    this.todos = todos.map((t, i) => ({
      id: t.id || `todo_${Date.now()}_${i}`,
      text: t.text || "",
      done: typeof t.done === "boolean" ? t.done : t.status === "done",
    }));
  }

  async saveTodos() {
    await storage.set({ todos: this.todos });
  }

  setupEventListeners() {
    safeAddEventListener(this.addBtn, "click", () => {
      if (!this.inputRow) return;
      this.inputRow.hidden = !this.inputRow.hidden;
      if (!this.inputRow.hidden) this.input?.focus();
      else this.addFromInput();
    });

    safeAddEventListener(this.input, "keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addFromInput();
      }
    });
  }

  async addFromInput() {
    const text = (this.input?.value || "").trim();
    if (!text) {
      if (this.inputRow) this.inputRow.hidden = true;
      return;
    }
    this.todos.unshift({ id: `todo_${Date.now()}`, text, done: false });
    if (this.input) this.input.value = "";
    await this.saveTodos();
    this.renderTodos();
  }

  renderTodos() {
    if (!this.container) return;
    clearChildren(this.container);

    const doneCount = this.todos.filter((t) => t.done).length;
    if (this.countEl) {
      this.countEl.textContent = `${toPersianNumber(doneCount)}/${toPersianNumber(this.todos.length)}`;
    }

    if (this.todos.length === 0) {
      const empty = createElement("div", { className: "empty-sm" }, "برای افزودن تسک، + را بزن");
      this.container.appendChild(empty);
      return;
    }

    this.todos.forEach((todo) => {
      const item = createElement("div", {
        className: `item${todo.done ? " done" : ""}`,
      });

      const ck = createElement("span", { className: "ck" }, todo.done ? "✓" : "");
      const txt = createElement("span", { className: "txt" }, todo.text);
      const del = createElement("button", { className: "del", title: "حذف" }, "🗑");

      safeAddEventListener(item, "click", async (e) => {
        if (e.target === del) return;
        todo.done = !todo.done;
        await this.saveTodos();
        this.renderTodos();
      });

      safeAddEventListener(del, "click", async (e) => {
        e.stopPropagation();
        this.todos = this.todos.filter((t) => t.id !== todo.id);
        await this.saveTodos();
        this.renderTodos();
      });

      item.appendChild(ck);
      item.appendChild(txt);
      item.appendChild(del);
      this.container.appendChild(item);
    });
  }

  async refresh() {
    await this.loadTodos();
    this.renderTodos();
  }

  async saveState() {
    await this.saveTodos();
  }
}
