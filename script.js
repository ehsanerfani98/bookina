/**
 * Bookina Application Loader
 * This file loads the modular application structure
 */

// Import the main application module
import BookinaApp from './src/main.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Set up global error handling
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection (handled gracefully):', event.reason);
    event.preventDefault(); // Prevent the browser's default unhandled rejection behavior
  });

  // Initialize the application
  try {
    window.bookinaApp = new BookinaApp();
  } catch (error) {
    console.error('Failed to initialize Bookina application:', error);
    
    // Fallback: Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
      <strong>خطا در بارگذاری برنامه:</strong> ${error.message}
      <br><small>لطفاً صفحه را رفرش کنید یا با پشتیبانی تماس بگیرید.</small>
    `;
    document.body.appendChild(errorDiv);
  }
});

// Export for potential external usage
export default BookinaApp;
