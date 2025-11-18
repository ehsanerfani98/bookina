document.addEventListener("DOMContentLoaded", () => {
  const bookmarksContainer = document.getElementById("bookmarksContainer");
  const addBookmarkBtn = document.getElementById("addBookmark");
  const settingsBtn = document.getElementById("settingsBtn");
  const bookmarkModal = document.getElementById("bookmarkModal");
  const settingModal = document.getElementById("settingModal");
  const modalTitle = document.getElementById("modalTitle");
  const bookmarkForm = document.getElementById("bookmarkForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const titleInput = document.getElementById("title");
  const urlInput = document.getElementById("url");
  const refresh = document.getElementById("refresh");

  let bookmarks = [];
  let editingBookmarkId = null;
  let draggedId = null; // برای ذخیره id کارت در حال درگ

  function toPersianNumber(input) {
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return input.toString().replace(/\d/g, (d) => persianDigits[d]);
  }

  // 🚀 گرفتن favicon و تبدیل به base64
  function fetchFaviconAsBase64(url, callback) {
    let faviconUrl;
    try {
      faviconUrl = new URL("/favicon.ico", url).href;
    } catch (e) {
      callback(null);
      return;
    }

    fetch(faviconUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => callback(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => callback(null));
  }

  // Load bookmarks from storage
  function loadBookmarks() {
    chrome.storage.local.get(["bookmarks"], (result) => {
      bookmarks = result.bookmarks || [];
      renderBookmarks();
    });
  }

  // Save bookmarks to storage
  function saveBookmarks() {
    chrome.storage.local.set({ bookmarks });
  }

  function getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2YjcyODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwYXRoIGQ9Ik0yIDEyYzAtNS41MjMgNC40NzcgMTAgMTAtMTBzMTAgNC40NzcgMTAgMTAiLz48L3N2Zz4=";
    }
  }

  function renderBookmarks() {
    bookmarksContainer.innerHTML = "";

    if (bookmarks.length === 0) {
      bookmarksContainer.innerHTML = `
          <div class="empty-state">
            <h2>No bookmarks yet</h2>
            <p>Click "Add New" to create your first bookmark</p>
          </div>
        `;
      return;
    }

    bookmarks.forEach((bookmark) => {
      const bookmarkCard = document.createElement("div");
      bookmarkCard.className = "bookmark-card";
      bookmarkCard.setAttribute("draggable", "true"); // اضافه کردن قابلیت درگ
      bookmarkCard.dataset.id = bookmark.id; // ذخیره id در data-id

      bookmarkCard.innerHTML = `
          <div class="bookmark-content" data-id="${bookmark.id}">
            <div class="favicon">
              <img src="${bookmark.favicon}" alt="favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><circle cx="12" cy="12" r="10"></circle><path d="M2 12c0-5.523 4.477-10 10-10s10 4.477 10 10"></path></svg>
            </div>
            <div class="bookmark-info">
              <h3>${bookmark.title}</h3>
            </div>
          </div>
          <div class="bookmark-actions">
            <i class="fas fa-edit edit-btn" data-id="${bookmark.id}"></i>
            <i class="fas fa-trash delete-btn" data-id="${bookmark.id}"></i>
          </div>
        `;

      // باز کردن لینک در تب جدید (اجتناب از کلیک روی دکمه‌ها)
      bookmarkCard
        .querySelector(".bookmark-content")
        .addEventListener("click", (e) => {
          if (!e.target.closest(".bookmark-actions")) {
            window.location.href = bookmark.url;
          }
        });

      // رویدادهای درگ اند دراپ
      bookmarkCard.addEventListener("dragstart", dragStart);
      bookmarkCard.addEventListener("dragover", dragOver);
      bookmarkCard.addEventListener("drop", drop);
      bookmarkCard.addEventListener("dragend", dragEnd);

      bookmarksContainer.appendChild(bookmarkCard);
    });

    // دکمه‌های ویرایش و حذف
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", handleEdit);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", handleDelete);
    });
  }

  // درگ استارت: ذخیره id در حال کشیدن
  function dragStart(e) {
    draggedId = e.currentTarget.dataset.id;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  }

  // هنگام درگ روی المان دیگر اجازه می‌دهیم دراپ شود
  function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  // هنگام دراپ، جای دو المان را عوض می‌کنیم
  function drop(e) {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.id;
    if (draggedId === targetId) return; // اگر روی خودش افتاد کاری نمی‌کنیم

    // پیدا کردن ایندکس‌ها
    const draggedIndex = bookmarks.findIndex((b) => b.id === draggedId);
    const targetIndex = bookmarks.findIndex((b) => b.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // جابجایی آرایه
    const [draggedItem] = bookmarks.splice(draggedIndex, 1);
    bookmarks.splice(targetIndex, 0, draggedItem);

    saveBookmarks();
    renderBookmarks();
  }

  // اتمام درگ: شفافیت رو برمی‌گردانیم
  function dragEnd(e) {
    e.currentTarget.style.opacity = "1";
    draggedId = null;
  }

  // ... باقی کد شما بدون تغییر

  // Show modal
  function showModal(title = "اضافه کردن آدرس جدید") {
    modalTitle.textContent = title;
    bookmarkModal.style.display = "flex";
    titleInput.focus();
  }

  function showModalSetting(title = "تنظیمات") {
    modalTitle.textContent = title;
    settingModal.style.display = "flex";
  }

  // Hide modal
  function hideModal() {
    bookmarkModal.style.display = "none";
    bookmarkForm.reset();
    editingBookmarkId = null;
  }

  function hideSettingModal() {
    settingModal.style.display = "none";
  }

  // Add new bookmark
  function handleAdd() {
    showModal();
  }

  function handleSetting() {
    showModalSetting();
  }

  // Edit bookmark
  function handleEdit(e) {
    const id = e.target.dataset.id;
    const bookmark = bookmarks.find((b) => b.id === id);

    if (bookmark) {
      editingBookmarkId = id;
      titleInput.value = bookmark.title;
      urlInput.value = bookmark.url;
      showModal("ویرایش نشانک");
    }
  }

  // Delete bookmark
  function handleDelete(e) {
    const id = e.target.dataset.id;

    if (confirm("آیا مطمئن هستید که می‌خواهید این نشانک را حذف کنید؟")) {
      bookmarks = bookmarks.filter((b) => b.id !== id);
      saveBookmarks();
      renderBookmarks();
    }
  }

  // Form submission
  // Form submission
  bookmarkForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) return;

    if (editingBookmarkId) {
      // ویرایش
      const index = bookmarks.findIndex((b) => b.id === editingBookmarkId);
      if (index !== -1) {
        bookmarks[index] = {
          ...bookmarks[index],
          title,
          url,
          favicon: getFaviconUrl(url),
        };
        saveBookmarks();
        renderBookmarks();
      }
    } else {
      // افزودن
      const newBookmark = {
        id: Date.now().toString(),
        title,
        url,
        favicon: getFaviconUrl(url),
      };

      bookmarks.push(newBookmark);
      saveBookmarks();
      renderBookmarks();
    }

    hideModal();
  });

  // Event listeners
  addBookmarkBtn.addEventListener("click", handleAdd);
  cancelBtn.addEventListener("click", hideModal);

  bookmarkModal.addEventListener("click", (e) => {
    if (e.target === bookmarkModal) {
      hideModal();
    }
  });

  // Initial load
  loadBookmarks();


  settingsBtn.addEventListener("click", handleSetting);
  settingModal.addEventListener("click", (e) => {
    if (e.target === settingModal) {
      hideSettingModal();
    }
  });
  // ---------------- ToDo List ----------------
  const todoInput = document.getElementById("todoInput");
  const addTodoBtn = document.getElementById("addTodo");
  const todoList = document.getElementById("todoList");

  let todos = [];

  // Load todos
  function loadTodos() {
    chrome.storage.local.get(["todos"], (result) => {
      todos = result.todos || [];
      renderTodos();
    });
  }

  // Save todos
  function saveTodos() {
    chrome.storage.local.set({ todos });
  }

  function renderTodos() {
    todoList.innerHTML = "";
    todos.forEach((todo, index) => {
      const li = document.createElement("li");
      li.className = `todo-item ${todo.status}`;

      li.innerHTML = `
      <span data-index="${index}">${todo.text}</span>
      <div class="todo-actions">
        <select data-index="${index}">
          <option value="pending" ${todo.status === "pending" ? "selected" : ""
        }>انجام نشده</option>
          <option value="inprogress" ${todo.status === "inprogress" ? "selected" : ""
        }>در حال انجام</option>
          <option value="done" ${todo.status === "done" ? "selected" : ""
        }>انجام شده</option>
        </select>
        <button data-index="${index}">&times;</button>
      </div>
    `;

      // تغییر وضعیت
      li.querySelector("select").addEventListener("change", (e) => {
        todos[index].status = e.target.value;
        saveTodos();
        renderTodos();
      });

      // حذف
      li.querySelector("button").addEventListener("click", () => {
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
      });

      todoList.appendChild(li);
    });
  }

  // افزودن تسک
  function handleAddTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    todos.push({ text, status: "pending" }); // پیش‌فرض: انجام‌نشده
    todoInput.value = "";
    saveTodos();
    renderTodos();
  }

  addTodoBtn.addEventListener("click", handleAddTodo);
  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleAddTodo();
  });

  // Initial load
  loadTodos();

  const exportBtn = document.getElementById("exportBackup");
  const importBtn = document.getElementById("importBackup");
  const importFile = document.getElementById("importFile");

  // 📤 Export Backup
  function exportBackup() {
    chrome.storage.local.get(["bookmarks", "todos", "stickyNotes"], (result) => {
      const dataStr = JSON.stringify(result, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Bookina-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // 📥 Import Backup
  function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // فقط اگر bookmarks یا todos داخلش باشه
        const newData = {
          bookmarks: data.bookmarks || [],
          todos: data.todos || [],
          stickyNotes: data.stickyNotes || [],
        };

        chrome.storage.local.set(newData, () => {
          alert("بکاپ با موفقیت ایمپورت شد ✅");
          // دوباره لود کنیم
          bookmarks = newData.bookmarks;
          todos = newData.todos;
          stickyNotes = newData.stickyNotes;
          renderBookmarks();
          renderTodos();
          renderStickyNotes();
        });
      } catch (err) {
        alert("فایل بکاپ معتبر نیست ❌");
      }
    };
    reader.readAsText(file);
  }

  exportBtn.addEventListener("click", exportBackup);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importBackup);

  // تبدیل میلادی به شمسی
  function toJalaali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = gm > 2 ? gy + 1 : gy;
    let days =
      355666 +
      365 * gy +
      Math.floor((gy + 3) / 4) -
      Math.floor((gy + 99) / 100) +
      Math.floor((gy + 399) / 400) +
      gd +
      g_d_m[gm - 1];

    let jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;

    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }

    let jm =
      days < 186
        ? 1 + Math.floor(days / 31)
        : 7 + Math.floor((days - 186) / 30);
    let jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

    return { jy, jm, jd };
  }

  // نمایش تاریخ شمسی واقعی - این تابع دیگر استفاده نمی‌شود
  // زیرا تاریخ در تقویم نمایش داده می‌شود

  // ---------------- تقویم شمسی ---------------- 
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const calendarMonthYear = document.getElementById("calendarMonthYear");
  const calendarDays = document.getElementById("calendarDays");
  const currentDayName = document.getElementById("currentDayName");
  const currentJalaaliDate = document.getElementById("currentJalaaliDate");

  let currentJalaaliYear = 1403;
  let currentJalaaliMonth = 1;

  // محاسبه تعداد روزهای ماه شمسی
  function getJalaaliMonthDays(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    // اسفند - محاسبه سال کبیسه
    const leapYear = (jy - 474) % 128;
    return leapYear === 0 || leapYear === 4 || leapYear === 8 || leapYear === 12 ||
           leapYear === 16 || leapYear === 20 || leapYear === 24 || leapYear === 28 ||
           leapYear === 32 || leapYear === 36 || leapYear === 40 || leapYear === 44 ||
           leapYear === 48 || leapYear === 52 || leapYear === 56 || leapYear === 60 ||
           leapYear === 64 || leapYear === 68 || leapYear === 72 || leapYear === 76 ||
           leapYear === 80 || leapYear === 84 || leapYear === 88 || leapYear === 92 ||
           leapYear === 96 || leapYear === 100 || leapYear === 104 || leapYear === 108 ||
           leapYear === 112 || leapYear === 116 || leapYear === 120 || leapYear === 124 ? 30 : 29;
  }

  // محاسبه روز شروع ماه شمسی
  function getJalaaliMonthStartDay(jy, jm) {
    // محاسبه تاریخ میلادی اولین روز ماه شمسی
    const { gy, gm, gd } = toGregorian(jy, jm, 1);
    const firstDay = new Date(gy, gm - 1, gd);
    return firstDay.getDay();
  }

  // تبدیل شمسی به میلادی
  function toGregorian(jy, jm, jd) {
    let gy = jy + 621;
    let leap = (jy - 474) % 128;
    let leapYear = leap === 0 || leap === 4 || leap === 8 || leap === 12 ||
                   leap === 16 || leap === 20 || leap === 24 || leap === 28 ||
                   leap === 32 || leap === 36 || leap === 40 || leap === 44 ||
                   leap === 48 || leap === 52 || leap === 56 || leap === 60 ||
                   leap === 64 || leap === 68 || leap === 72 || leap === 76 ||
                   leap === 80 || leap === 84 || leap === 88 || leap === 92 ||
                   leap === 96 || leap === 100 || leap === 104 || leap === 108 ||
                   leap === 112 || leap === 116 || leap === 120 || leap === 124;
    
    let days = jd - 1;
    if (jm <= 6) {
      days += (jm - 1) * 31;
    } else {
      days += 186 + (jm - 7) * 30;
    }
    
    // محاسبه تاریخ میلادی
    let g_days = 355666 + 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
    let total_days = g_days + days;
    
    // محاسبه سال میلادی
    let gy2 = Math.floor((total_days - 1) / 365.2425);
    let g_days2 = 365 * gy2 + Math.floor(gy2 / 4) - Math.floor(gy2 / 100) + Math.floor(gy2 / 400);
    let day_of_year = total_days - g_days2;
    
    // محاسبه ماه و روز میلادی
    let gm = 0;
    let gd = day_of_year;
    let g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // سال کبیسه میلادی
    if ((gy2 % 4 === 0 && gy2 % 100 !== 0) || gy2 % 400 === 0) {
      g_days_in_month[1] = 29;
    }
    
    for (let i = 0; i < 12; i++) {
      if (gd <= g_days_in_month[i]) {
        gm = i + 1;
        break;
      }
      gd -= g_days_in_month[i];
    }
    
    return { gy: gy2, gm, gd };
  }

  // نام ماه‌های شمسی
  const persianMonths = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
  ];

  // روزهای هفته - اصلاح شده برای تطابق با getDay() که یکشنبه=0
  const daysOfWeek = [
    "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"
  ];

  // روزهای هفته کوتاه برای تقویم
  const shortDaysOfWeek = [
    "ی", "د", "س", "چ", "پ", "ج", "ش"
  ];

  // رندر تقویم
  function renderCalendar(jy, jm) {
    const today = new Date();
    const { jy: todayJy, jm: todayJm, jd: todayJd } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    // به‌روزرسانی عنوان ماه و سال
    calendarMonthYear.textContent = `${persianMonths[jm - 1]} ${toPersianNumber(jy)}`;
    
    // محاسبه روز شروع ماه
    const startDay = getJalaaliMonthStartDay(jy, jm);
    const daysInMonth = getJalaaliMonthDays(jy, jm);
    
    // پاک کردن روزهای قبلی
    calendarDays.innerHTML = '';
    
    // اضافه کردن خانه‌های خالی قبل از شروع ماه
    for (let i = 0; i < startDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarDays.appendChild(emptyDay);
    }
    
    // اضافه کردن روزهای ماه
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = toPersianNumber(day);
      
      // محاسبه روز هفته برای این تاریخ
      const dayOfWeek = (startDay + day - 1) % 7;
      
      // هایلایت کردن امروز
      if (jy === todayJy && jm === todayJm && day === todayJd) {
        dayElement.classList.add('today');
      }
      
      // رنگ‌آمیزی جمعه‌ها به رنگ قرمز (جمعه = index 5 در آرایه shortDaysOfWeek)
      if (dayOfWeek === 6) { // جمعه = index 5
        dayElement.classList.add('friday');
      }
      
      calendarDays.appendChild(dayElement);
    }
    
    // به‌روزرسانی تاریخ امروز در فوتر
    currentDayName.textContent = daysOfWeek[today.getDay()];
    currentJalaaliDate.textContent = `${toPersianNumber(todayJd)} ${persianMonths[todayJm - 1]} ${toPersianNumber(todayJy)}`;
  }

  // ناوبری بین ماه‌ها
  function navigateMonth(direction) {
    if (direction === 'prev') {
      currentJalaaliMonth--;
      if (currentJalaaliMonth < 1) {
        currentJalaaliMonth = 12;
        currentJalaaliYear--;
      }
    } else {
      currentJalaaliMonth++;
      if (currentJalaaliMonth > 12) {
        currentJalaaliMonth = 1;
        currentJalaaliYear++;
      }
    }
    renderCalendar(currentJalaaliYear, currentJalaaliMonth);
  }

  // مقداردهی اولیه با تاریخ امروز
  function initializeCalendar() {
    const today = new Date();
    const { jy, jm } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    currentJalaaliYear = jy;
    currentJalaaliMonth = jm;
    renderCalendar(jy, jm);
  }

  // رویدادهای دکمه‌های ناوبری
  prevMonthBtn.addEventListener('click', () => navigateMonth('prev'));
  nextMonthBtn.addEventListener('click', () => navigateMonth('next'));

  // مقداردهی اولیه تقویم
  initializeCalendar();

  const alarmTimeInput = document.getElementById("alarmTime");
  const setAlarmBtn = document.getElementById("setAlarm");
  const alarmList = document.getElementById("alarmList");

  // Load & state
  let alarms = JSON.parse(localStorage.getItem("alarms") || "[]");

  function saveAlarms() {
    localStorage.setItem("alarms", JSON.stringify(alarms));
  }

  function renderAlarms() {
    alarmList.innerHTML = "";
    alarms.forEach((alarm, index) => {
      const li = document.createElement("li");
      li.className = "alarm-item";
      const hh = String(alarm.hour).padStart(2, "0");
      const mm = String(alarm.minute).padStart(2, "0");
      li.innerHTML = `
        <span class="alarm-time">${hh}:${mm}</span>
        <div class="alarm-actions">
          <button class="alarm-edit"   data-action="edit"   data-index="${index}" type="button">✏️</button>
          <button class="alarm-delete" data-action="delete" data-index="${index}" type="button">❌</button>
        </div>
      `;
      alarmList.appendChild(li);
    });
  }

  // Add alarm (no inline)
  if (setAlarmBtn) {
    setAlarmBtn.addEventListener("click", () => {
      const v = alarmTimeInput.value;
      if (!v) return;
      const [h, m] = v.split(":").map((n) => parseInt(n, 10));
      alarms.push({
        hour: Math.min(23, Math.max(0, h)),
        minute: Math.min(59, Math.max(0, m)),
      });
      saveAlarms();
      renderAlarms();
      alarmTimeInput.value = "";
    });
  }

  // Event delegation for edit/delete (CSP-safe)
  if (alarmList) {
    alarmList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const idx = parseInt(btn.dataset.index, 10);
      const action = btn.dataset.action;

      if (Number.isNaN(idx) || !alarms[idx]) return;

      if (action === "delete") {
        alarms.splice(idx, 1);
        saveAlarms();
        renderAlarms();
        return;
      }

      if (action === "edit") {
        const a = alarms[idx];
        const def = `${String(a.hour).padStart(2, "0")}:${String(
          a.minute
        ).padStart(2, "0")}`;
        const newTime = prompt("زمان جدید را وارد کنید (HH:MM)", def);
        if (!newTime) return;

        const m = /^(\d{1,2}):(\d{1,2})$/.exec(newTime);
        if (!m) return alert("فرمت نادرست است. نمونه صحیح: 08:30");

        const nh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
        const nm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
        alarms[idx] = { hour: nh, minute: nm };
        saveAlarms();
        renderAlarms();
      }
    });
  }

  // Checker (no change; safe with CSP)
  setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    alarms.forEach((alarm) => {
      if (parseInt(alarm.hour) === h && parseInt(alarm.minute) === m) {
        showAlarmNotification();
        playAlarmSound();
        // اگر یک‌بارمصرف می‌خوای:
        // alarms = alarms.filter(a => !(a.hour === h && a.minute === m));
        // saveAlarms(); renderAlarms();
      }
    });
  }, 30_000);

  // Optional: request permission once
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }

  function showAlarmNotification() {
    const iconUrl =
      window.chrome && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("icon.png")
        : "icon.png";

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("⏰ آلارم", {
        body: "زمان تنظیم‌شده رسید!",
        icon: iconUrl,
      });
    } else {
      alert("⏰ زمان آلارم رسید!");
    }
  }

  function playAlarmSound() {
    const src =
      window.chrome && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("alarm.mp3")
        : "alarm.mp3";
    const audio = new Audio(src);
    audio.play().catch(() => { });
  }

  // renderAlarms();

  // ========== خبرها ==========
  async function loadNews() {
    refresh.className = "fas fa-refresh refresh-news";
    try {
      const response = await fetch(
        "https://api.allorigins.win/get?url=https://www.zoomit.ir/feed"
      );

      const data = await response.json();
      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, "application/xml");
      const items = xml.querySelectorAll("item");

      let html = "";
      items.forEach((item, i) => {
        if (i < 10) {
          // console.log(item.querySelector("media:content"));

          const title = item.querySelector("title").textContent;
          const link = item.querySelector("link").textContent;
          html += `<div class="news-item"><a href="${link}" target="_blank">${title}</a></div>`;
        }
      });
      refresh.className = "fas fa-refresh";
      document.getElementById("newsList").innerHTML = html;
    } catch (err) {
      refresh.className = "fas fa-refresh";
      document.getElementById("newsList").innerText = "خطا در دریافت خبرها";
      console.error(err);
    }
  }
  loadNews();

  refresh.addEventListener("click", (e) => {
    loadNews();
  });


  // ---------------- وضعیت هوا ----------------
  const citySelect = document.getElementById("citySelect");
  const weatherInfo = document.getElementById("weatherInfo");
  const API_KEY = "7e5281913ad99ee9c641fac9516fd191";

  // تابع دریافت آب و هوا
  async function fetchWeather(city) {
    try {
      weatherInfo.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;

      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          city
        )}&limit=1&appid=${API_KEY}`
      );

      if (!geoRes.ok) {
        throw new Error(`خطا در دریافت مختصات: ${geoRes.status}`);
      }

      const geoData = await geoRes.json();
      if (!geoData.length) {
        weatherInfo.innerHTML = `
        <div class="error">
          <p>❌ شهر "${city}" پیدا نشد</p>
          <button onclick="fetchWeather('${citySelect.value}')">تلاش مجدد</button>
        </div>
      `;
        return;
      }

      const { lat, lon } = geoData[0];

      // دریافت اطلاعات آب و هوا
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&lang=fa&units=metric`
      );

      if (!weatherRes.ok) {
        throw new Error(`خطا در دریافت آب و هوا: ${weatherRes.status}`);
      }

      const weatherData = await weatherRes.json();

      // استخراج اطلاعات
      const tempC = Math.round(weatherData.main.temp);
      const feelsLike = Math.round(weatherData.main.feels_like);
      const tempMin = Math.round(weatherData.main.temp_min);
      const tempMax = Math.round(weatherData.main.temp_max);
      const humidity = weatherData.main.humidity;
      const pressure = weatherData.main.pressure;
      const windSpeed = weatherData.wind?.speed || 0;
      const windDeg = weatherData.wind?.deg || 0;
      const description = weatherData.weather[0].description;
      const icon = weatherData.weather[0].icon;
      const cityName = weatherData.name;
      const country = weatherData.sys.country;
      const sunrise = new Date(weatherData.sys.sunrise * 1000);
      const sunset = new Date(weatherData.sys.sunset * 1000);

      // تابع جهت باد
      function getWindDirection(deg) {
        const directions = ['شمال', 'شمال شرقی', 'شرق', 'جنوب شرقی', 'جنوب', 'جنوب غربی', 'غرب', 'شمال غربی'];
        return directions[Math.round(deg / 45) % 8];
      }

      // نمایش اطلاعات کامل
      weatherInfo.innerHTML = `
      <div class="weather-card">
        <div class="weather-header">
          <div class="location-info">
            <h2>📍 ${cityName}</h2>
            <p class="description">${description}</p>
          </div>
          <div class="temp-current">
            <span class="temp-unit">°C</span>
            <span class="temp-value">${toPersianDigits(tempC)}</span>
          </div>
        </div>
        <div class="update-time">
          <p>🕐 به‌روزرسانی: ${new Date().toLocaleTimeString('fa-IR')}</p>
        </div>
      </div>
    `;

    } catch (err) {
      console.error("Weather API Error:", err);
      weatherInfo.innerHTML = `
      <div class="error">
        <p>⚠ خطا در دریافت اطلاعات</p>
        <p class="error-details">${err.message}</p>
        <button onclick="fetchWeather('${citySelect.value}')">تلاش مجدد</button>
      </div>
    `;
    }
  }

  // تابع کمکی برای تبدیل اعداد به فارسی
  function toPersianDigits(num) {
    return num.toString().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }

  // رویداد تغییر شهر
  citySelect.addEventListener("change", (e) => {
    fetchWeather(e.target.value);
  });

  fetchWeather(citySelect.value);



  const images = ['bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.jpg', 'bg6.jpg', 'bg7.jpg', 'bg8.jpg']; // نام همه تصاویر
  const backgroundsContainer = document.getElementById('backgrounds');
  const popup = document.getElementById('settingsPopup');
  const overlay = document.getElementById('overlay');
  const closePopup = document.getElementById('closePopup');

  // بارگذاری تامبنیل‌ها
  images.forEach(img => {
    const div = document.createElement('div');
    div.classList.add('bg-thumb');
    div.style.backgroundImage = `url('images/${img}')`;
    div.dataset.img = img;
    backgroundsContainer.appendChild(div);
  });


  // تغییر پس‌زمینه و ذخیره
  document.querySelectorAll('.bg-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      // حذف انتخاب قبلی
      document.querySelectorAll('.bg-thumb').forEach(t => t.classList.remove('selected'));
      thumb.classList.add('selected');

      // تغییر پس‌زمینه صفحه
      document.body.style.backgroundImage = `url('images/${thumb.dataset.img}')`;

      // ذخیره در localStorage
      localStorage.setItem('selectedBg', thumb.dataset.img);
    });
  });

  // بارگذاری پس‌زمینه ذخیره شده
  const savedBg = localStorage.getItem('selectedBg');
  if (savedBg) {
    document.body.style.backgroundImage = `url('images/${savedBg}')`;
    document.querySelectorAll('.bg-thumb').forEach(t => {
      if (t.dataset.img === savedBg) t.classList.add('selected');
    });
  }


  // ---------------- استیکی نوت ----------------
  const addStickyNoteBtn = document.getElementById("addStickyNote");
  const stickyNotesContainer = document.getElementById("stickyNotesContainer");
  const stickyNoteModal = document.getElementById("stickyNoteModal");
  const cancelColorBtn = document.getElementById("cancelColorBtn");
  const colorOptions = document.querySelectorAll(".color-option");

  let stickyNotes = [];
  let currentNote = null;

  // بارگذاری استیکی نوت‌ها از حافظه
  function loadStickyNotes() {
    chrome.storage.local.get(["stickyNotes"], (result) => {
      stickyNotes = result.stickyNotes || [];
      renderStickyNotes();
    });
  }

  // ذخیره استیکی نوت‌ها
  function saveStickyNotes() {
    chrome.storage.local.set({ stickyNotes });
  }

  // نمایش استیکی نوت‌ها
  function renderStickyNotes() {
    stickyNotesContainer.innerHTML = "";
    stickyNotes.forEach((note) => {
      createStickyNoteElement(note);
    });
  }

  // ایجاد المان استیکی نوت
  function createStickyNoteElement(note) {
    const noteElement = document.createElement("div");
    noteElement.className = "sticky-note";
    noteElement.id = note.id;
    noteElement.style.left = note.x + "px";
    noteElement.style.top = note.y + "px";
    noteElement.style.backgroundColor = note.color;

    noteElement.innerHTML = `
        <div class="sticky-note-header">
          <div class="sticky-note-actions">
            <button class="sticky-note-color-btn"><i class="fas fa-palette"></i></button>
            <button class="sticky-note-delete-btn"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <textarea class="sticky-note-content" placeholder="یادداشت خود را اینجا بنویسید...">${note.content}</textarea>
      `;

    // افزودن قابلیت درگ
    makeDraggable(noteElement);

    // رویداد تغییر رنگ
    noteElement.querySelector(".sticky-note-color-btn").addEventListener("click", () => {
      currentNote = note;
      stickyNoteModal.style.display = "flex";
    });

    // رویداد حذف
    noteElement.querySelector(".sticky-note-delete-btn").addEventListener("click", () => {
      if (confirm("آیا از حذف این یادداشت مطمئن هستید؟")) {
        stickyNotes = stickyNotes.filter((n) => n.id !== note.id);
        saveStickyNotes();
        renderStickyNotes();
      }
    });

    // رویداد تغییر محتوا
    const textarea = noteElement.querySelector(".sticky-note-content");
    textarea.addEventListener("input", () => {
      note.content = textarea.value;
      saveStickyNotes();
    });

    stickyNotesContainer.appendChild(noteElement);
  }

  // ایجاد قابلیت درگ برای استیکی نوت
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.querySelector(".sticky-note-header").onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      // موقعیت کلیک ماوس
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      // محاسبه موقعیت جدید
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // تنظیم موقعیت جدید
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // توقف حرکت وقتی ماوس رها شود
      document.onmouseup = null;
      document.onmousemove = null;

      // ذخیره موقعیت جدید
      const noteId = element.id;
      const noteIndex = stickyNotes.findIndex((n) => n.id === noteId);
      if (noteIndex !== -1) {
        stickyNotes[noteIndex].x = parseInt(element.style.left);
        stickyNotes[noteIndex].y = parseInt(element.style.top);
        saveStickyNotes();
      }
    }
  }

  // افزودن استیکی نوت جدید
  addStickyNoteBtn.addEventListener("click", () => {
    const newNote = {
      id: "note_" + Date.now(),
      content: "",
      color: "#ffeb3b",
      x: window.innerWidth - 370,
      y: window.innerHeight / 2 - 350
      };

    stickyNotes.push(newNote);
    saveStickyNotes();
    createStickyNoteElement(newNote);
  });

  // مدیریت انتخاب رنگ
  colorOptions.forEach(option => {
    option.addEventListener("click", () => {
      if (currentNote) {
        const newColor = option.getAttribute("data-color");
        currentNote.color = newColor;

        // به‌روزرسانی رنگ در صفحه
        const noteElement = document.getElementById(currentNote.id);
        if (noteElement) {
          noteElement.style.backgroundColor = newColor;
        }

        saveStickyNotes();
        stickyNoteModal.style.display = "none";
        currentNote = null;
      }
    });
  });

  // بستن مودال رنگ
  cancelColorBtn.addEventListener("click", () => {
    stickyNoteModal.style.display = "none";
    currentNote = null;
  });

  stickyNoteModal.addEventListener("click", (e) => {
    if (e.target === stickyNoteModal) {
      stickyNoteModal.style.display = "none";
      currentNote = null;
    }
  });

  // بارگذاری اولیه استیکی نوت‌ها
  loadStickyNotes();



  // مدیریت تب‌ها
  const tabs = document.querySelectorAll(".tab");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");

      // غیرفعال کردن همه تب‌ها
      tabs.forEach(t => t.classList.remove("active"));
      tabPanes.forEach(pane => pane.classList.remove("active"));

      // فعال کردن تب انتخاب شده
      tab.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });


});
