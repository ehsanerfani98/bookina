/**
 * Habits Module — weekly habit tracker with progress bars
 */

import { getElement, createElement, clearChildren, safeAddEventListener, toggleModal, showNotification, confirmDialog } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber, toGregorian } from "../utils/date.js";

const HABIT_COLORS = ["#4f6bff", "#17c08b", "#f5a524", "#ec4899", "#a855f7"];

/** Key of the current Persian week (starting Saturday) e.g. "2025-10-18" */
function currentWeekKey() {
  const now = new Date();
  // days since Saturday: JS getDay() 0=Sun..6=Sat → Sat=0
  const daysSinceSat = (now.getDay() + 1) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceSat);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

export class HabitsManager {
  constructor() {
    this.habits = [];
    this.list = getElement("habitsList");
    this.addBtn = getElement("addHabit");
    this.modal = getElement("habitModal");
    this.form = getElement("habitForm");
    this.nameInput = getElement("habitName");
    this.targetInput = getElement("habitTarget");
    this.colorsWrap = getElement("habitColors");
    this.modalTitle = getElement("habitModalTitle");

    this.editingId = null;
    this.selectedColor = HABIT_COLORS[0];
  }

  async initialize() {
    await this.loadHabits();
    this.setupEventListeners();
    this.renderHabits();
  }

  async loadHabits() {
    const result = await storage.get("habits");
    this.habits = result.habits || [];
    this.resetWeekIfNeeded();
  }

  async saveHabits() {
    await storage.set({ habits: this.habits });
  }

  resetWeekIfNeeded() {
    const key = currentWeekKey();
    let changed = false;
    this.habits.forEach((h) => {
      if (!h.week || h.week.key !== key) {
        h.week = { key, days: {} };
        changed = true;
      }
    });
    if (changed) this.saveHabits();
  }

  todayIndex() {
    return (new Date().getDay() + 1) % 7; // 0 = Saturday
  }

  weekDoneCount(habit) {
    return Object.values(habit.week?.days || {}).filter(Boolean).length;
  }

  setupEventListeners() {
    safeAddEventListener(this.addBtn, "click", () => this.showAddModal());

    safeAddEventListener(this.form, "submit", (e) => this.handleSubmit(e));

    // color dots
    if (this.colorsWrap) {
      this.colorsWrap.innerHTML = "";
      HABIT_COLORS.forEach((c, i) => {
        const dot = createElement("div", {
          className: `color-dot${i === 0 ? " sel" : ""}`,
        });
        dot.style.background = c;
        dot.dataset.color = c;
        safeAddEventListener(dot, "click", () => {
          this.selectedColor = c;
          this.colorsWrap.querySelectorAll(".color-dot").forEach((d) => d.classList.remove("sel"));
          dot.classList.add("sel");
        });
        this.colorsWrap.appendChild(dot);
      });
    }
  }

  showAddModal() {
    this.editingId = null;
    if (this.modalTitle) this.modalTitle.textContent = "عادت جدید";
    if (this.nameInput) this.nameInput.value = "";
    if (this.targetInput) this.targetInput.value = 3;
    this.selectedColor = HABIT_COLORS[0];
    this.colorsWrap?.querySelectorAll(".color-dot").forEach((d, i) => {
      d.classList.toggle("sel", i === 0);
    });
    toggleModal(this.modal, true);
    setTimeout(() => this.nameInput?.focus(), 50);
  }

  showEditModal(habit) {
    this.editingId = habit.id;
    if (this.modalTitle) this.modalTitle.textContent = "ویرایش عادت";
    if (this.nameInput) this.nameInput.value = habit.name;
    if (this.targetInput) this.targetInput.value = habit.target;
    this.selectedColor = habit.color || HABIT_COLORS[0];
    this.colorsWrap?.querySelectorAll(".color-dot").forEach((d) => {
      d.classList.toggle("sel", d.dataset.color === this.selectedColor);
    });
    toggleModal(this.modal, true);
  }

  async handleSubmit(e) {
    e.preventDefault();
    const name = (this.nameInput?.value || "").trim();
    const target = Math.min(7, Math.max(1, parseInt(this.targetInput?.value, 10) || 1));
    if (!name) return;

    if (this.editingId) {
      const habit = this.habits.find((h) => h.id === this.editingId);
      if (habit) {
        habit.name = name;
        habit.target = target;
        habit.color = this.selectedColor;
      }
    } else {
      this.habits.push({
        id: `habit_${Date.now()}`,
        name,
        target,
        color: this.selectedColor,
        week: { key: currentWeekKey(), days: {} },
      });
    }

    await this.saveHabits();
    this.renderHabits();
    toggleModal(this.modal, false);
  }

  async toggleToday(habit) {
    const idx = this.todayIndex();
    if (!habit.week || habit.week.key !== currentWeekKey()) {
      habit.week = { key: currentWeekKey(), days: {} };
    }
    habit.week.days[idx] = !habit.week.days[idx];
    await this.saveHabits();
    this.renderHabits();
  }

  async deleteHabit(habit) {
    const confirmed = await confirmDialog(`عادت «${habit.name}» حذف شود؟`);
    if (!confirmed) return;
    this.habits = this.habits.filter((h) => h.id !== habit.id);
    await this.saveHabits();
    this.renderHabits();
    showNotification("عادت حذف شد", "info");
  }

  renderHabits() {
    if (!this.list) return;
    clearChildren(this.list);

    if (this.habits.length === 0) {
      this.list.appendChild(
        createElement("div", { className: "empty-sm" }, "هنوز عادتی نداری — با + شروع کن")
      );
      return;
    }

    const idx = this.todayIndex();

    this.habits.forEach((habit) => {
      const done = this.weekDoneCount(habit);
      const pct = Math.min(100, Math.round((done / habit.target) * 100));
      const checkedToday = !!habit.week?.days?.[idx];

      const row = createElement("div", { className: "item habit-row" });

      const check = createElement("div", { className: `habit-check${checkedToday ? " on" : ""}`, title: "ثبت امروز" }, checkedToday ? "✓" : "");
      if (checkedToday) check.style.background = habit.color;

      const info = createElement("div", { className: "habit-info" });
      const nameRow = createElement("div", { className: "habit-name" });
      const name = createElement("span", {}, habit.name);
      const count = createElement(
        "span",
        { className: "sm" },
        `${toPersianNumber(done)}/${toPersianNumber(habit.target)}`
      );
      nameRow.appendChild(name);
      nameRow.appendChild(count);

      const bar = createElement("div", { className: "bar" });
      const fill = createElement("i");
      fill.style.width = `${pct}%`;
      fill.style.background = habit.color;
      bar.appendChild(fill);

      info.appendChild(nameRow);
      info.appendChild(bar);

      const actions = createElement("div", { className: "habit-actions" });
      const editBtn = createElement("button", { title: "ویرایش" }, "✎");
      const delBtn = createElement("button", { className: "del", title: "حذف" }, "🗑");
      safeAddEventListener(editBtn, "click", (e) => {
        e.stopPropagation();
        this.showEditModal(habit);
      });
      safeAddEventListener(delBtn, "click", (e) => {
        e.stopPropagation();
        this.deleteHabit(habit);
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      safeAddEventListener(check, "click", (e) => {
        e.stopPropagation();
        this.toggleToday(habit);
      });

      row.appendChild(check);
      row.appendChild(info);
      row.appendChild(actions);
      this.list.appendChild(row);
    });
  }

  async refresh() {
    await this.loadHabits();
    this.renderHabits();
  }

  async saveState() {
    await this.saveHabits();
  }
}
