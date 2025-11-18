# Bookina - بوکینا

<div dir="rtl">

# بوکینا - داشبورد شخصی فارسی

بوکینا یک برنامه داشبورد شخصی مدرن و بهینه‌شده برای تب جدید مرورگر کروم است که با طراحی شیشه‌ای (Glassmorphism) و رابط کاربری فارسی توسعه یافته است.

![بوکینا](screenshot.png)

## ✨ ویژگی‌ها

### 📅 تقویم فارسی
- نمایش تقویم جلالی (شمسی) با قابلیت ناوبری ماه‌ها
- هایلایت کردن تاریخ امروز
- نمایش نام روزهای هفته به فارسی
- اعداد فارسی در تمام بخش‌ها

### 📝 مدیریت وظایف (Todo)
- افزودن و حذف تسک‌ها
- علامت‌گذاری تسک‌های انجام شده
- رابط کاربری ساده و سریع

### 🔖 مدیریت بوکمارک‌ها
- افزودن، ویرایش و حذف بوکمارک
- نمایش favicon سایت‌ها
- قابلیت Drag & Drop برای مرتب‌سازی
- ذخیره‌سازی خودکار

### 🌦 وضعیت آب و هوا
- نمایش وضعیت آب و هوا برای شهرهای مختلف ایران
- قابلیت انتخاب شهر (قزوین، تهران، مشهد، اصفهان، تبریز، شیراز)
- اطلاعات دما و شرایط جوی

### 📰 اخبار
- نمایش آخرین اخبار
- قابلیت رفرش اطلاعات
- طراحی کارت‌های خبری

### 📌 یادداشت‌های چسبان (Sticky Notes)
- ایجاد یادداشت‌های رنگی
- قابلیت Drag & Drop
- ذخیره‌سازی خودکار
- انتخاب از بین ۱۲ رنگ مختلف

![بوکینا](screenshot1.png)

### ⚙️ تنظیمات
- انتخاب تصویر پس‌زمینه از بین ۸ گزینه
- سیستم پشتیبان‌گیری و بازیابی
- ذخیره‌سازی تمام تنظیمات
![بوکینا](screenshot2.png)

### 🕐 ساعت آنالوگ
- نمایش ساعت آنالوگ زیبا
- طراحی شیشه‌ای هماهنگ با کل برنامه

## 🚀 نصب و راه‌اندازی

### نصب به عنوان افزونه کروم

1. فایل پروژه را دانلود کنید
2. مرورگر کروم را باز کنید و به آدرس `chrome://extensions/` بروید
3. گزینه "Developer mode" را در右上角 فعال کنید
4. روی "Load unpacked" کلیک کنید و پوشه پروژه را انتخاب کنید
5. افزونه بوکینا نصب شده و در تب جدید نمایش داده می‌شود

### اجرا به عنوان برنامه وب

1. فایل `index.html` را در مرورگر باز کنید
2. برنامه به صورت مستقیم اجرا می‌شود

## 🏗 معماری فنی

### ساختار ماژولار
```
src/
├── main.js              # نقطه ورود اصلی برنامه
├── modules/
│   ├── bookmarks.js     # مدیریت بوکمارک‌ها
│   ├── todos.js         # مدیریت تسک‌ها
│   ├── calendar.js      # تقویم فارسی
│   ├── weather.js       # وضعیت آب و هوا
│   ├── news.js          # نمایش اخبار
│   ├── stickyNotes.js   # یادداشت‌های چسبان
│   └── settings.js      # تنظیمات
└── utils/
    ├── storage.js       # مدیریت ذخیره‌سازی
    ├── date.js          # ابزارهای تاریخ فارسی
    └── dom.js           # ابزارهای DOM
```

### تکنولوژی‌ها
- **HTML5** - ساختار صفحه
- **CSS3** - استایل‌دهی با طراحی Glassmorphism
- **JavaScript ES6+** - منطق برنامه
- **Chrome Extension API** - یکپارچه‌سازی با مرورگر
- **Modular JavaScript** - معماری ماژولار

### API‌های استفاده شده
- Chrome Storage API برای ذخیره‌سازی داده‌ها
- Weather API برای اطلاعات آب و هوا
- News API برای دریافت اخبار

## 🔧 توسعه

### پیش‌نیازها
- مرورگر کروم
- ویرایشگر کد (VS Code پیشنهاد می‌شود)

### ساختار توسعه
```javascript
// نمونه کد ماژول
export class ModuleManager {
  constructor() {
    // مقداردهی اولیه
  }

  async initialize() {
    // راه‌اندازی ماژول
  }

  // متدهای عمومی
}
```

### افزودن ماژول جدید
1. فایل جدید در پوشه `src/modules/` ایجاد کنید
2. کلاس ماژول را با متد `initialize` بسازید
3. ماژول را در `src/main.js` import کنید
4. ماژول را در تابع `initializeModules` اضافه کنید

## 📦 فایل‌های مهم
- `index.html` - ساختار اصلی صفحه
- `manifest.json` - تنظیمات افزونه کروم
- `src/main.js` - نقطه ورود برنامه
- `styles.css` - استایل‌های اصلی
- `src/utils/` - ابزارهای کمکی

## 🤝 مشارکت
برای مشارکت در توسعه بوکینا:
1. پروژه را Fork کنید
2. Branch جدید ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را Commit کنید (`git commit -m 'Add amazing feature'`)
4. به Branch اصلی Push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

## 📄 لایسنس
این پروژه تحت لایسنس MIT منتشر شده است.

## 📞 پشتیبانی
برای گزارش باگ یا پیشنهاد ویژگی جدید، لطفاً از بخش Issues در گیت‌هاب استفاده کنید.

---

</div>

<div dir="ltr">

# Bookina - Persian Personal Dashboard

Bookina is a modern, optimized personal dashboard for Chrome's new tab, developed with Glassmorphism design and Persian user interface.

![Bookina](screenshot.png)

## ✨ Features

### 📅 Persian Calendar
- Display of Jalali (Solar) calendar with month navigation
- Today's date highlighting
- Persian weekday names
- Persian numerals throughout

### 📝 Task Management (Todo)
- Add and remove tasks
- Mark completed tasks
- Simple and fast user interface

### 🔖 Bookmark Management
- Add, edit, and delete bookmarks
- Website favicon display
- Drag & Drop functionality for sorting
- Automatic saving

### 🌦 Weather Status
- Weather information for various Iranian cities
- City selection (Qazvin, Tehran, Mashhad, Isfahan, Tabriz, Shiraz)
- Temperature and weather conditions

### 📰 News
- Display of latest news
- Refresh capability
- News card design

### 📌 Sticky Notes
- Create colored notes
- Drag & Drop functionality
- Automatic saving
- Choice of 12 different colors

### ⚙️ Settings
- Background image selection from 8 options
- Backup and restore system
- Save all settings

### 🕐 Analog Clock
- Beautiful analog clock display
- Glass design consistent with the entire application

## 🚀 Installation & Setup

### Install as Chrome Extension

1. Download the project files
2. Open Chrome browser and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. Bookina extension is installed and will appear in new tabs

### Run as Web Application

1. Open `index.html` in your browser
2. The application will run directly

## 🏗 Technical Architecture

### Modular Structure
```
src/
├── main.js              # Main application entry point
├── modules/
│   ├── bookmarks.js     # Bookmark management
│   ├── todos.js         # Task management
│   ├── calendar.js      # Persian calendar
│   ├── weather.js       # Weather status
│   ├── news.js          # News display
│   ├── stickyNotes.js   # Sticky notes
│   └── settings.js      # Settings
└── utils/
    ├── storage.js       # Storage management
    ├── date.js          # Persian date utilities
    └── dom.js           # DOM utilities
```

### Technologies
- **HTML5** - Page structure
- **CSS3** - Styling with Glassmorphism design
- **JavaScript ES6+** - Application logic
- **Chrome Extension API** - Browser integration
- **Modular JavaScript** - Modular architecture

### APIs Used
- Chrome Storage API for data storage
- Weather API for weather information
- News API for news retrieval

## 🔧 Development

### Prerequisites
- Chrome browser
- Code editor (VS Code recommended)

### Development Structure
```javascript
// Module code sample
export class ModuleManager {
  constructor() {
    // Initialization
  }

  async initialize() {
    // Module setup
  }

  // Public methods
}
```

### Adding New Module
1. Create new file in `src/modules/` folder
2. Build module class with `initialize` method
3. Import module in `src/main.js`
4. Add module in `initializeModules` function

## 📦 Important Files
- `index.html` - Main page structure
- `manifest.json` - Chrome extension settings
- `src/main.js` - Application entry point
- `styles.css` - Main styles
- `src/utils/` - Utility tools

## 🤝 Contribution
To contribute to Bookina development:
1. Fork the project
2. Create new branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📄 License
This project is released under MIT License.

## 📞 Support
For bug reports or feature suggestions, please use the Issues section on GitHub.

</div>
