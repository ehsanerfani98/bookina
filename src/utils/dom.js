/**
 * DOM Utility - Common DOM manipulation and event handling functions
 */

/**
 * Get element by ID with optional error handling
 * @param {string} id - Element ID
 * @param {boolean} throwError - Whether to throw error if element not found
 * @returns {HTMLElement|null}
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
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement|Array} children - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = null) {
  const element = document.createElement(tag);

  // Set attributes
  Object.keys(attributes).forEach(key => {
    if (key === 'className') {
      element.className = attributes[key];
    } else if (key === 'innerHTML') {
      element.innerHTML = attributes[key];
    } else {
      element.setAttribute(key, attributes[key]);
    }
  });

  // Add children
  if (children) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    } else if (typeof children === 'string') {
      element.textContent = children;
    } else {
      element.appendChild(children);
    }
  }

  return element;
}

/**
 * Safe event listener with error handling
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 */
export function safeAddEventListener(element, event, handler, options = {}) {
  if (!element) {
    console.warn('Cannot add event listener to null element');
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
 * @param {HTMLElement} parent - Parent element
 */
export function clearChildren(parent) {
  if (parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}

/**
 * Toggle modal visibility
 * @param {HTMLElement} modal - Modal element
 * @param {boolean} show - Whether to show or hide
 */
export function toggleModal(modal, show) {
  if (modal) {
    modal.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Create modal close handler
 * @param {HTMLElement} modal - Modal element
 * @param {Function} onClose - Additional close handler
 * @returns {Function} Close handler function
 */
export function createModalCloseHandler(modal, onClose = null) {
  return (e) => {
    if (e.target === modal) {
      toggleModal(modal, false);
      if (onClose) onClose();
    }
  };
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
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

/**
 * Format URL for favicon
 * @param {string} url - Website URL
 * @returns {string} Favicon URL
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
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element
  const notification = createElement('div', {
    className: `notification notification-${type}`,
    style: `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      z-index: 10000;
      font-family: inherit;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `
  }, message);

  // Set background color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  notification.style.backgroundColor = colors[type] || colors.info;

  // Add to document
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);

  // Remove after duration
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * Confirm dialog with custom message
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>}
 */
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const result = window.confirm(message);
    resolve(result);
  });
}

/**
 * Load external script dynamically
 * @param {string} src - Script source URL
 * @returns {Promise}
 */
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Load external stylesheet dynamically
 * @param {string} href - Stylesheet URL
 * @returns {Promise}
 */
export function loadStyle(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}
