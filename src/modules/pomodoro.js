/**
 * Pomodoro Module — work/break timer with SVG progress ring,
 * auto mode-switching, daily counter and a soft beep.
 */

import { getElement, safeAddEventListener, showNotification } from "../utils/dom.js";
import { storage } from "../utils/storage.js";
import { toPersianNumber } from "../utils/date.js";

const WORK_MIN = 25;
const BREAK_MIN = 5;
const RING_LEN = 2 * Math.PI * 54; // circumference of r=54

function todayKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export class PomodoroManager {
  constructor() {
    this.mode = "work"; // work | break
    this.remaining = WORK_MIN * 60;
    this.running = false;
    this.interval = null;
    this.todayCount = 0;

    this.seg = getElement("pomoSeg");
    this.ring = getElement("pomoRing");
    this.display = getElement("pomoDisplay");
    this.startBtn = getElement("pomoStart");
    this.resetBtn = getElement("pomoReset");
    this.countEl = getElement("pomoCount");
  }

  async initialize() {
    await this.loadState();
    this.setupEventListeners();
    this.render();
    this.startTicking();
    console.log("Pomodoro module initialized");
  }

  async loadState() {
    const result = await storage.get("pomodoroState");
    const state = result.pomodoroState;
    if (state) {
      this.mode = state.mode === "break" ? "break" : "work";
      this.remaining = Number(state.remaining) || (this.mode === "work" ? WORK_MIN : BREAK_MIN) * 60;
      if (state.count && state.count.date === todayKey()) {
        this.todayCount = Number(state.count.n) || 0;
      }
    }
  }

  async saveState() {
    await storage.set({
      pomodoroState: {
        mode: this.mode,
        remaining: this.remaining,
        running: false,
        count: { date: todayKey(), n: this.todayCount },
      },
    });
  }

  setupEventListeners() {
    safeAddEventListener(this.seg, "click", (e) => {
      const span = e.target.closest("[data-mode]");
      if (!span) return;
      if (span.dataset.mode !== this.mode) this.switchMode(span.dataset.mode);
    });

    safeAddEventListener(this.startBtn, "click", () => this.toggleRun());
    safeAddEventListener(this.resetBtn, "click", () => this.resetTimer());

    // pause when page hidden to avoid drift, resume on visible
    safeAddEventListener(document, "visibilitychange", () => {
      if (document.hidden && this.running) {
        this.toggleRun();
      }
    });
  }

  switchMode(mode, silent = false) {
    this.mode = mode;
    this.remaining = (mode === "work" ? WORK_MIN : BREAK_MIN) * 60;
    this.setRunning(false);
    this.render();
    if (!silent) showNotification(mode === "work" ? "حالت کار" : "حالت استراحت", "info", 1500);
  }

  toggleRun() {
    this.setRunning(!this.running);
    this.render();
  }

  setRunning(run) {
    this.running = run;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (run) {
      this.interval = setInterval(() => this.tick(), 1000);
    }
    if (this.startBtn) this.startBtn.textContent = run ? "⏸" : "▶";
  }

  resetTimer() {
    this.remaining = (this.mode === "work" ? WORK_MIN : BREAK_MIN) * 60;
    this.setRunning(false);
    this.render();
  }

  tick() {
    this.remaining--;
    if (this.remaining <= 0) {
      this.complete();
      return;
    }
    this.render();
  }

  complete() {
    try {
      this.beep();
    } catch (e) {
      /* audio may be blocked — ignore */
    }
    if (this.mode === "work") {
      this.todayCount++;
      showNotification("پومودورو تمام شد! وقت استراحت ☕️", "success", 5000);
      this.switchMode("break", true);
    } else {
      showNotification("استراحت تمام شد — بزن بریم! 💪", "success", 5000);
      this.switchMode("work", true);
    }
    this.saveState();
  }

  beep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  render() {
    const total = (this.mode === "work" ? WORK_MIN : BREAK_MIN) * 60;
    const mm = Math.floor(this.remaining / 60);
    const ss = this.remaining % 60;
    const txt = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

    if (this.display) this.display.textContent = toPersianNumber(txt);

    if (this.ring) {
      const elapsed = total - this.remaining;
      this.ring.style.strokeDashoffset = String(RING_LEN * (1 - elapsed / total));
      this.ring.classList.toggle("break", this.mode === "break");
    }

    // segments
    this.seg?.querySelectorAll("[data-mode]").forEach((s) => {
      const on = s.dataset.mode === this.mode;
      s.classList.toggle("on", on);
      s.classList.toggle("break", on && this.mode === "break");
    });

    if (this.countEl) {
      this.countEl.textContent = `امروز: ${toPersianNumber(this.todayCount)} پومودورو`;
    }
  }

  startTicking() {
    // persist periodically so state survives tab close
    this.persistTimer = setInterval(() => {
      if (this.running) this.saveState();
    }, 30000);
  }

  destroy() {
    if (this.interval) clearInterval(this.interval);
    if (this.persistTimer) clearInterval(this.persistTimer);
  }

  async refresh() {
    this.render();
  }
}
