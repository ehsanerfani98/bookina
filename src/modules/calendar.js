/**
 * Calendar Module - Persian calendar with navigation and highlighting
 * Based on the working calendar implementation from the 'calender' folder
 */
import { getElement, createElement, clearChildren, safeAddEventListener } from '../utils/dom.js';

export class CalendarManager {
  constructor() {
    this.prevBtn = getElement('prevMonth');
    this.nextBtn = getElement('nextMonth');
    this.monthYear = getElement('calendarMonthYear');
    this.daysContainer = getElement('calendarDays');
    this.dayName = getElement('currentDayName');
    this.jalaaliDate = getElement('currentJalaaliDate');

    this.monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    this.dayNames = [
      'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
    ];

    safeAddEventListener(this.prevBtn, 'click', () => this.goToPreviousMonth());
    safeAddEventListener(this.nextBtn, 'click', () => this.goToNextMonth());
  }

  async initialize() {
    const today = new Date();
    const [jy, jm, jd] = this.gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

    this.currentJalali = { year: jy, month: jm, day: jd };
    this.selectedJalali = { year: jy, month: jm, day: jd };

    this.renderCalendar();
    this.updateTodayInfo();
    return Promise.resolve();
  }

  // Persian (Jalali) Calendar Conversion Functions from working calendar
  gregorianToJalali(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + (parseInt((gy2 + 3) / 4)) - (parseInt((gy2 + 99) / 100)) + (parseInt((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (parseInt(days / 12053));
    days %= 12053;
    jy += 4 * (parseInt(days / 1461));
    days %= 1461;
    jy += parseInt((days - 1) / 365);
    if (days > 365) days = (days - 1) % 365;
    var jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }

  jalaliToGregorian(jy, jm, jd) {
    jy += 1595;
    var days = -355668 + (365 * jy) + (parseInt(jy / 33) * 8) + parseInt(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    var gy = 400 * parseInt(days / 146097);
    days %= 146097;
    if (days > 36524) {
      gy += 100 * parseInt(--days / 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * parseInt(days / 1461);
    days %= 1461;
    if (days > 365) {
      gy += parseInt((days - 1) / 365);
      days = (days - 1) % 365;
    }
    var gd = days + 1;
    var sal_a = [0, 31, ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm;
    for (gm = 0; gm < 13; gm++) {
      var v = sal_a[gm];
      if (gd <= v) break;
      gd -= v;
    }
    return [gy, gm, gd];
  }

  getJalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    // Esfand - check for leap year
    if (((jy - 474) % 128) < 30) return 30;
    return 29;
  }

  getJalaliWeekday(jy, jm, jd) {
    const [gy, gm, gd] = this.jalaliToGregorian(jy, jm, jd);
    const date = new Date(gy, gm - 1, gd);
    let weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
    // Convert to Persian week (0 = Saturday, 6 = Friday)
    return (weekday + 1) % 7;
  }

  renderCalendar() {
    clearChildren(this.daysContainer);

    const jy = this.currentJalali.year;
    const jm = this.currentJalali.month;

    // Update header
    this.monthYear.textContent = `${this.monthNames[jm - 1]} ${this.toPersianNumber(jy)}`;

    // Get first day of month and number of days
    const firstDayWeekday = this.getJalaliWeekday(jy, jm, 1);
    const daysInMonth = this.getJalaliMonthLength(jy, jm);

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayWeekday; i++) {
      const dayElement = createElement('div', { className: 'calendar-day empty' });
      this.daysContainer.appendChild(dayElement);
    }

    // Add days of current month
    const today = new Date();
    const [todayJy, todayJm, todayJd] = this.gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = createElement('div', { className: 'calendar-day' }, this.toPersianNumber(day));

      // Check if this is today
      if (day === todayJd && jm === todayJm && jy === todayJy) {
        dayElement.classList.add('today');
      }

      // Check if this is selected date
      if (day === this.selectedJalali.day &&
        jm === this.selectedJalali.month &&
        jy === this.selectedJalali.year) {
        dayElement.classList.add('selected');
      }

      // Color Fridays (dayOfWeek === 6 in Iranian calendar)
      const dayOfWeek = (firstDayWeekday + day - 1) % 7;
      if (dayOfWeek === 6) {
        dayElement.classList.add('friday');
      }

      safeAddEventListener(dayElement, 'click', () => {
        this.selectDate(jy, jm, day);
      });

      this.daysContainer.appendChild(dayElement);
    }

    // Add empty cells for days after the last day of month
    const totalCells = 42; // 6 weeks * 7 days
    const remainingCells = totalCells - (firstDayWeekday + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
      const dayElement = createElement('div', { className: 'calendar-day empty' });
      this.daysContainer.appendChild(dayElement);
    }
  }

  selectDate(year, month, day) {
    this.selectedJalali = { year, month, day };
    this.renderCalendar();
    this.updateTodayInfo();
  }

  updateTodayInfo() {
    const today = new Date();
    const [todayJy, todayJm, todayJd] = this.gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const todayWeekday = this.getJalaliWeekday(todayJy, todayJm, todayJd);

    if (this.selectedJalali.year === todayJy &&
      this.selectedJalali.month === todayJm &&
      this.selectedJalali.day === todayJd) {
      this.dayName.textContent = this.dayNames[todayWeekday];
      this.jalaaliDate.textContent = `${this.toPersianNumber(todayJd)} ${this.monthNames[todayJm - 1]} ${this.toPersianNumber(todayJy)}`;
    } else {
      const selectedWeekday = this.getJalaliWeekday(this.selectedJalali.year, this.selectedJalali.month, this.selectedJalali.day);
      this.dayName.textContent = this.dayNames[selectedWeekday];
      this.jalaaliDate.textContent = `${this.toPersianNumber(this.selectedJalali.day)} ${this.monthNames[this.selectedJalali.month - 1]} ${this.toPersianNumber(this.selectedJalali.year)}`;
    }
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
    const today = new Date();
    const [jy, jm, jd] = this.gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    this.currentJalali = { year: jy, month: jm, day: jd };
    this.selectedJalali = { year: jy, month: jm, day: jd };
    this.renderCalendar();
    this.updateTodayInfo();
  }

  toPersianNumber(input) {
    const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return input.toString().replace(/\d/g, c => digits[c]);
  }

  // Public API methods
  getCurrentDate() {
    return {
      year: this.currentJalali.year,
      month: this.currentJalali.month,
      monthName: this.monthNames[this.currentJalali.month - 1]
    };
  }

  goToToday() {
    this.goToToday();
  }

  goToDate(year, month) {
    this.currentJalali.year = year;
    this.currentJalali.month = month;
    this.renderCalendar();
  }

  async refresh() {
    this.renderCalendar();
  }

  async saveState() {
    return Promise.resolve();
  }
}
