/**
 * DOM Utility - Common DOM manipulation and event handling functions
 */

/**
 * Get element by ID with optional error handling
 */
export function getElement(id, throwError = false) {
  const element = document.getElementById(id);
  if (!element && throwError) {
    console.error(`Element with ID '${id}' not found`);
  }
  return element;
}

/**
 * Create element with attributes and children
 */
export function createElement(tag, attributes = {}, children = null) {
  const element = document.createElement(tag);

  Object.keys(attributes).forEach((key) => {
    if (key === "className") {
      element.className = attributes[key];
    } else if (key === "innerHTML") {
      element.innerHTML = attributes[key];
    } else {
      element.setAttribute(key, attributes[key]);
    }
  });

  if (children) {
    if (Array.isArray(children)) {
      children.forEach((child) => {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    } else if (typeof children === "string") {
      element.textContent = children;
    } else {
      element.appendChild(children);
    }
  }

  return element;
}

/**
 * Safe event listener with error handling
 */
export function safeAddEventListener(element, event, handler, options = {}) {
  if (!element) {
    console.warn(`Cannot add ${event} listener to null element`);
    return;
  }
  try {
    element.addEventListener(event, handler, options);
  } catch (error) {
    console.error(`Error adding event listener for ${event}:`, error);
  }
}

/**
 * Remove all child elements from a parent
 */
export function clearChildren(parent) {
  if (parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}

/**
 * Show / hide a modal by id (adds .open class)
 */
export function toggleModal(modal, show) {
  if (!modal) return;
  if (typeof modal === "string") modal = getElement(modal);
  if (!modal) return;
  modal.classList.toggle("open", !!show);
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

/**
 * Format URL for favicon
 */
export function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2YjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Ik0yIDEyYzAtNS41MjMgNC40NzcgMTAgMTAtMTBzMTAgNC40NzcgMTAgMTAiLz48L3N2Zz4=";
  }
}

/**
 * Normalize a URL: add https:// if scheme missing
 */
export function normalizeUrl(url) {
  const u = (url || "").trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return "https://" + u;
}

/**
 * Show notification to user (styled via .notification CSS)
 */
export function showNotification(message, type = "info", duration = 3500) {
  const notification = createElement(
    "div",
    { className: `notification notification-${type}` },
    ""
  );
  const span = createElement("span", {}, message);
  const closeBtn = createElement("button", { className: "notification-close" }, "✕");
  notification.appendChild(span);
  notification.appendChild(closeBtn);
  document.body.appendChild(notification);

  const remove = () => {
    if (notification.parentNode) notification.remove();
  };
  closeBtn.addEventListener("click", remove);
  setTimeout(remove, duration);
}

/**
 * Confirm dialog with custom message — resolves true/false
 */
export function confirmDialog(message, { danger = true, confirmText = "تأیید" } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal open";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.cssText = "max-width: 360px;";

    const messageEl = document.createElement("p");
    messageEl.className = "confirm-msg";
    messageEl.textContent = message;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "form-actions";
    actionsDiv.style.justifyContent = "center";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-ghost";
    cancelBtn.textContent = "انصراف";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = danger ? "btn-danger" : "btn-accent";
    confirmBtn.textContent = confirmText;

    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(confirmBtn);
    modalContent.appendChild(messageEl);
    modalContent.appendChild(actionsDiv);
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);

    const cleanup = (val) => {
      overlay.remove();
      resolve(val);
    };

    cancelBtn.addEventListener("click", () => cleanup(false));
    confirmBtn.addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * Debounce function for performance optimization
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
