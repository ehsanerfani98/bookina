/**
 * Search Module — top search bar with selectable engine and "/" shortcut
 */

import { getElement, safeAddEventListener } from "../utils/dom.js";
import { storage } from "../utils/storage.js";

const ENGINES = {
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  wikipedia: (q) => `https://fa.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
};

export class SearchManager {
  constructor() {
    this.input = getElement("searchInput");
    this.engineSelect = getElement("searchEngine");
  }

  async initialize() {
    const result = await storage.get("searchEngine");
    if (result.searchEngine && ENGINES[result.searchEngine] && this.engineSelect) {
      this.engineSelect.value = result.searchEngine;
    }

    safeAddEventListener(this.engineSelect, "change", () => {
      storage.set({ searchEngine: this.engineSelect.value });
    });

    safeAddEventListener(this.input, "keydown", (e) => {
      if (e.key === "Enter") this.search();
    });

    // "/" focuses the search box (when not typing elsewhere)
    safeAddEventListener(document, "keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      this.input?.focus();
    });

    console.log("Search module initialized");
  }

  search() {
    const q = (this.input?.value || "").trim();
    if (!q) return;

    // looks like a URL → go directly
    const looksLikeUrl =
      /^(https?:\/\/)/i.test(q) ||
      (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !q.includes(" "));

    if (looksLikeUrl) {
      window.location.href = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      return;
    }

    const engine = this.engineSelect?.value || "google";
    const url = (ENGINES[engine] || ENGINES.google)(q);
    window.location.href = url;
  }

  async refresh() {
    /* nothing to refresh */
  }

  async saveState() {
    return Promise.resolve();
  }
}
