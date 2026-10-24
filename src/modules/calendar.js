/**
 * Calendar Module — Persian (Jalali) calendar with month navigation,
 * today highlighting, Friday coloring and day selection.
 */

import { getElement, createElement, clearChildren, safeAddEventListener } from "../utils/dom.js";
import {
  toJalaali,
  toGregorian,
  todayJalaali,
  getJalaaliMonthDays,
  getJalaaliWeekday,
  toPersianNumber,
  formatJalaaliDate,
  persianMonths,
  daysOfWeekShort,
  daysOfWeek,
} from "../utils/date.js";

export class CalendarManager {
  constructor() {
    this.prevBtn = getElement("prevMonth");
    this.nextBtn = getElement("nextMonth");
    this.todayBtn = getElement("calToday");
    this.monthYear = getElement("calendarMonthYear");
    this.weekdaysContainer = getElement("calendarWeekdays");
    this.daysContainer = getElement("calendarDays");
    this.dayName = getElement("currentDayName");
    this.jalaaliDate = getElement("currentJalaaliDate");

    safeAddEventListener(this.prevBtn, "click", () => this.goToPreviousMonth());
    safeAddEventListener(this.nextBtn, "click", () => this.goToNextMonth());
    safeAddEventListener(this.todayBtn, "click", () => this.goToToday());
  }

  async initialize() {
    this.renderWeekdays();
    const t = todayJalaali();
    this.currentJalali = { year: t.jy, month: t.jm, day: t.jd };
    this.selectedJalali = { year: t.jy, month: t.jm, day: t.jd };
    this.renderCalendar();
    this.updateSelectedInfo();
    console.log("Calendar module initialized");
  }

  renderWeekdays() {
    if (!this.weekdaysContainer) return;
    clearChildren(this.weekdaysContainer);
    daysOfWeekShort.forEach((d) => {
      const span = createElement("span", {}, d);
      if (d === "ج") span.classList.add("r");
      this.weekdaysContainer.appendChild(span);
    });
  }

  renderCalendar() {
    if (!this.daysContainer) return;
    clearChildren(this.daysContainer);

    const { year: jy, month: jm } = this.currentJalali;

    if (this.monthYear) {
      this.monthYear.textContent = `${persianMonths[jm - 1]} ${toPersianNumber(jy)}`;
    }

    const firstDayWeekday = getJalaaliWeekday(jy, jm, 1);
    const daysInMonth = getJalaaliMonthDays(jy, jm);

    const t = todayJalaali();

    // leading empty cells
    for (let i = 0; i < firstDayWeekday; i++) {
      const cell = createElement("span", { className: "empty" });
      this.daysContainer.appendChild(cell);
    }

    // days
    for (let day = 1; day <= daysInMonth; day++) {
      const span = createElement("span", {}, toPersianNumber(day));

      if (day === t.jd && jm === t.jm && jy === t.jy) {
        span.classList.add("t");
      }
      if (
        day === this.selectedJalali.day &&
        jm === this.selectedJalali.month &&
        jy === this.selectedJalali.year &&
        !(day === t.jd && jm === t.jm && jy === t.jy)
      ) {
        span.classList.add("sel");
      }
      // Friday is the 7th column (index 6)
      if ((firstDayWeekday + day - 1) % 7 === 6) {
        span.classList.add("r");
      }

      safeAddEventListener(span, "click", () => {
        this.selectedJalali = { year: jy, month: jm, day };
        this.renderCalendar();
        this.updateSelectedInfo();
      });

      this.daysContainer.appendChild(span);
    }

    // trailing empty cells to complete the last week row
    const used = firstDayWeekday + daysInMonth;
    const remaining = (7 - (used % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      this.daysContainer.appendChild(createElement("span", { className: "empty" }));
    }
  }

  updateSelectedInfo() {
    if (!this.dayName || !this.jalaaliDate) return;
    const s = this.selectedJalali;
    const weekdayIdx = getJalaaliWeekday(s.year, s.month, s.day);
    this.dayName.textContent = daysOfWeek[weekdayIdx];
    this.jalaaliDate.textContent = formatJalaaliDate(s.year, s.month, s.day);
  }

  goToPreviousMonth() {
    if (this.currentJalali.month === 1) {
      this.currentJalali.month = 12;
      this.currentJalali.year--;
    } else {
      this.currentJalali.month--;
    }
    this.renderCalendar();
  }

  goToNextMonth() {
    if (this.currentJalali.month === 12) {
      this.currentJalali.month = 1;
      this.currentJalali.year++;
    } else {
      this.currentJalali.month++;
    }
    this.renderCalendar();
  }

  goToToday() {
    const t = todayJalaali();
    this.currentJalali = { year: t.jy, month: t.jm, day: t.jd };
    this.selectedJalali = { ...this.currentJalali };
    this.renderCalendar();
    this.updateSelectedInfo();
  }

  async refresh() {
    this.renderCalendar();
    this.updateSelectedInfo();
  }

  async saveState() {
    return Promise.resolve();
  }
}
