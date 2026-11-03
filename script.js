
// ==========================================
// MONTHLY PLANNER 2.0
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

// Replace these values with your Firebase web app config.

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ==========================================
// 2. VARIABLES
// ==========================================

const $ = (id) => document.getElementById(id);

let mode = "login";
let currentUser = null;
let selectedDate = new Date();
let viewDate = new Date();
let allTasks = {};
let copiedTasks = [];
let unsubscribeTasks = null;
let saveQueue = Promise.resolve();
let lastAlarmMinute = "";


// ==========================================
// 3. DATE HELPERS
// ==========================================

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const todayKey = () => dateKey(new Date());

const makeId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const safeUsername = (value) =>
  value.trim().toLowerCase();

const usernameEmail = (username) =>
  `${safeUsername(username)}@monthlyplanner.app`;


// ==========================================
// 4. LOGIN AND SIGNUP
// ==========================================

function showMessage(message, good = false) {
  $("authMessage").textContent = message;

  $("authMessage").style.color =
    good ? "#8ee6b2" : "#f0a5a5";
}

function setMode(next) {
  mode = next;

  $("loginTab").classList.toggle(
    "active",
    mode === "login"
  );

  $("signupTab").classList.toggle(
    "active",
    mode === "signup"
  );

  $("authSubmit").textContent =
    mode === "login" ? "Log in" : "Create account";

  $("passwordInput").autocomplete =
    mode === "login"
      ? "current-password"
      : "new-password";

  showMessage("");
}

$("loginTab").addEventListener("click", () => {
  setMode("login");
});

$("signupTab").addEventListener("click", () => {
  setMode("signup");
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = safeUsername(
    $("usernameInput").value
  );

  const password = $("passwordInput").value;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    showMessage(
      "Use 3–20 characters: letters, numbers or underscores."
    );
    return;
  }

  if (password.length < 6) {
    showMessage(
      "Password must be at least 6 characters."
    );
    return;
  }

  $("authSubmit").disabled = true;

  showMessage(
    mode === "login"
      ? "Logging in..."
      : "Creating your account...",
    true
  );

  try {
    const email = usernameEmail(username);

    if (mode === "signup") {
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
    } else {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    }

  } catch (error) {

    const messages = {
      "auth/email-already-in-use":
        "That username is already taken. Try logging in.",

      "auth/invalid-credential":
        "Username or password is incorrect.",

      "auth/user-not-found":
        "Account not found. Create an account first.",

      "auth/weak-password":
        "Choose a stronger password.",

      "auth/network-request-failed":
        "Network error. Check your internet connection."
    };

    showMessage(
      messages[error.code] ||
      `Could not continue: ${error.message}`
    );

  } finally {
    $("authSubmit").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", () => {
  signOut(auth);
});


// ==========================================
// 5. ACCOUNT SESSION AND CLOUD TASKS
// ==========================================

onAuthStateChanged(auth, (user) => {

  currentUser = user;

  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }

  if (!user) {
    $("plannerApp").classList.add("hidden");
    $("authScreen").classList.remove("hidden");

    allTasks = {};
    return;
  }

  $("authScreen").classList.add("hidden");
  $("plannerApp").classList.remove("hidden");

  const username = user.email.split("@")[0];

  $("welcomeUser").textContent = `Hi, ${username}`;

  selectedDate = new Date();
  viewDate = new Date();

  const daysRef = collection(
    db,
    "users",
    user.uid,
    "days"
  );

  unsubscribeTasks = onSnapshot(daysRef, (snapshot) => {

    const next = {};

    snapshot.forEach((dayDoc) => {
      const data = dayDoc.data();

      next[dayDoc.id] =
        Array.isArray(data.tasks)
          ? data.tasks
          : [];
    });

    allTasks = next;

    renderCalendar();
    renderTasks();

  }, (error) => {
    console.error(error);

    alert(
      "Could not load your tasks. Check your Firebase setup."
    );
  });

});


// ==========================================
// 6. SAVE TASKS TO FIREBASE
// ==========================================

function saveDay(key) {

  if (!currentUser) return;

  const tasks = allTasks[key] || [];

  const ref = doc(
    db,
    "users",
    currentUser.uid,
    "days",
    key
  );

  saveQueue = saveQueue
    .then(() => setDoc(ref, {
      tasks,
      updatedAt: Date.now()
    }))
    .catch((error) => {
      console.error(error);

      alert(
        "Your change could not be saved. Check your internet connection."
      );
    });
}


// ==========================================
// 7. CALENDAR
// ==========================================

function renderCalendar() {

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  $("monthYear").textContent =
    viewDate.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });

  const firstDay =
    new Date(year, month, 1).getDay();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  const previousMonthDays =
    new Date(year, month, 0).getDate();

  const fragment =
    document.createDocumentFragment();

  for (let index = 0; index < 42; index++) {

    let dayNumber;
    let date;
    let muted = false;

    if (index < firstDay) {

      dayNumber =
        previousMonthDays - firstDay + index + 1;

      date = new Date(
        year,
        month - 1,
        dayNumber
      );

      muted = true;

    } else if (index >= firstDay + daysInMonth) {

      dayNumber =
        index - firstDay - daysInMonth + 1;

      date = new Date(
        year,
        month + 1,
        dayNumber
      );

      muted = true;

    } else {

      dayNumber = index - firstDay + 1;

      date = new Date(
        year,
        month,
        dayNumber
      );
    }

    const key = dateKey(date);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.textContent = dayNumber;

    if (muted) button.classList.add("muted");

    if (key === todayKey()) {
      button.classList.add("today");
    }

    if (key === dateKey(selectedDate)) {
      button.classList.add("selected");
    }

    if ((allTasks[key] || []).length) {
      button.classList.add("has-tasks");
    }

    button.addEventListener("click", () => {

      selectedDate = date;

      if (date.getMonth() !== viewDate.getMonth()) {
        viewDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        );
      }

      renderCalendar();
      renderTasks();
    });

    fragment.appendChild(button);
  }

  $("calendarDays").replaceChildren(fragment);
}

$("prevMonth").addEventListener("click", () => {

  viewDate = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() - 1,
    1
  );

  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {

  viewDate = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    1
  );

  renderCalendar();
});


// ==========================================
// 8. SUBTASK COMPLETION CHECK
// ==========================================

function isFullyComplete(task) {

  const subs = Array.isArray(task.subtasks)
    ? task.subtasks
    : [];

  return task.done &&
    subs.every((sub) => sub.done);
}


// ==========================================
// 9. DISPLAY TASKS
// ==========================================

function renderTasks() {

  const key = dateKey(selectedDate);
  const tasks = allTasks[key] || [];

  $("selectedDateText").textContent =
    selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  const doneCount =
    tasks.filter((task) => task.done).length;

  const percent = tasks.length
    ? Math.round(doneCount / tasks.length * 100)
    : 0;

  $("progressText").textContent =
    `${doneCount} of ${tasks.length} completed`;

  $("remainingText").textContent =
    tasks.length - doneCount
      ? `${tasks.length - doneCount} left`
      : (tasks.length ? "All done!" : "");

  $("progressFill").style.width =
    `${percent}%`;

  $("progressRing").style.setProperty(
    "--progress",
    `${percent}%`
  );

  $("progressPercent").textContent =
    `${percent}%`;

  const list = $("taskList");

  list.replaceChildren();

  $("emptyState").classList.toggle(
    "hidden",
    tasks.length > 0
  );

  tasks.forEach((task) => {

    if (!Array.isArray(task.subtasks)) {
      task.subtasks = [];
    }

    const item = document.createElement("article");
    item.className = "task-item";

    const main = document.createElement("div");
    main.className = "task-main";

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = !!task.done;

    checkbox.setAttribute(
      "aria-label",
      `Complete ${task.text}`
    );

    checkbox.addEventListener("change", () => {

      task.done = checkbox.checked;

      saveDay(key);
      renderTasks();
    });

    const title = document.createElement("span");

    title.className =
      `task-title${task.done ? " done" : ""}`;

    title.textContent = task.text;

    const time = document.createElement("span");

    time.className = "task-time";

    time.textContent =
      task.time ? `◷ ${task.time}` : "";

    const remove = document.createElement("button");

    remove.className = "delete-btn";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Delete task");

    remove.addEventListener("click", () => {

      allTasks[key] = tasks.filter(
        (entry) => entry.id !== task.id
      );

      saveDay(key);
      renderCalendar();
      renderTasks();
    });

    main.append(
      checkbox,
      title,
      time,
      remove
    );

    item.appendChild(main);


    // Hide subtasks when the main task
    // AND every subtask are completed.

    if (!isFullyComplete(task)) {

      const subArea = document.createElement("div");

      subArea.className = "subtask-area";

      task.subtasks.forEach((sub) => {

        const row = document.createElement("label");

        row.className =
          `subtask${sub.done ? " done" : ""}`;

        const subCheck = document.createElement("input");

        subCheck.type = "checkbox";
        subCheck.checked = !!sub.done;

        subCheck.addEventListener("change", () => {

          sub.done = subCheck.checked;

          saveDay(key);
          renderTasks();
        });

        const subText = document.createElement("span");

        subText.textContent = sub.text;

        const subDelete = document.createElement("button");

        subDelete.type = "button";
        subDelete.className = "delete-btn";
        subDelete.textContent = "×";

        subDelete.addEventListener("click", (event) => {

          event.preventDefault();

          task.subtasks = task.subtasks.filter(
            (entry) => entry.id !== sub.id
          );

          saveDay(key);
          renderTasks();
        });

        row.append(
          subCheck,
          subText,
          subDelete
        );

        subArea.appendChild(row);
      });


      // Add new subtask

      const addRow = document.createElement("form");

      addRow.className = "subtask-add";

      const input = document.createElement("input");

      input.placeholder = "Add a subtask...";
      input.maxLength = 120;

      input.setAttribute(
        "aria-label",
        "New subtask"
      );

      const add = document.createElement("button");

      add.type = "submit";
      add.textContent = "+";

      add.setAttribute(
        "aria-label",
        "Add subtask"
      );

      addRow.append(input, add);

      addRow.addEventListener("submit", (event) => {

        event.preventDefault();

        const text = input.value.trim();

        if (!text) return;

        task.subtasks.push({
          id: makeId(),
          text,
          done: false
        });

        saveDay(key);
        renderTasks();
      });

      subArea.appendChild(addRow);

      item.appendChild(subArea);
    }

    list.appendChild(item);
  });
}


// ==========================================
// 10. ADD MAIN TASK
// ==========================================

$("taskForm").addEventListener("submit", (event) => {

  event.preventDefault();

  const text = $("taskInput").value.trim();

  if (!text) return;

  const key = dateKey(selectedDate);

  if (!allTasks[key]) {
    allTasks[key] = [];
  }

  allTasks[key].push({
    id: makeId(),
    text,
    done: false,
    time: $("taskTime").value || "",
    alarmFired: false,
    subtasks: []
  });

  $("taskInput").value = "";
  $("taskTime").value = "";

  saveDay(key);
  renderCalendar();
  renderTasks();

  if (
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission().catch(() => {});
  }
});


// ==========================================
// 11. COPY AND PASTE TASKS
// ==========================================

function cloneTasks(tasks) {

  return tasks.map((task) => ({
    ...task,

    id: makeId(),

    done: false,

    alarmFired: false,

    subtasks: (task.subtasks || []).map((sub) => ({
      ...sub,
      id: makeId(),
      done: false
    }))
  }));
}

$("copyTasksBtn").addEventListener("click", () => {

  copiedTasks = JSON.parse(
    JSON.stringify(
      allTasks[dateKey(selectedDate)] || []
    )
  );

  alert(
    copiedTasks.length
      ? `Copied ${copiedTasks.length} task(s). Select another date and choose Paste day.`
      : "There are no tasks to copy on this date."
  );
});

$("pasteTasksBtn").addEventListener("click", () => {

  if (!copiedTasks.length) {
    alert("Copy a day first.");
    return;
  }

  const key = dateKey(selectedDate);

  allTasks[key] = [
    ...(allTasks[key] || []),
    ...cloneTasks(copiedTasks)
  ];

  saveDay(key);
  renderCalendar();
  renderTasks();
});

$("copyMonthBtn").addEventListener("click", () => {

  const source =
    allTasks[dateKey(selectedDate)] || [];

  if (!source.length) {
    alert("There are no tasks to copy on this date.");
    return;
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  for (
    let day = 1;
    day <= new Date(year, month + 1, 0).getDate();
    day++
  ) {

    const targetDate = new Date(year, month, day);
    const key = dateKey(targetDate);

    if (key === dateKey(selectedDate)) continue;

    allTasks[key] = [
      ...(allTasks[key] || []),
      ...cloneTasks(source)
    ];

    saveDay(key);
  }

  renderCalendar();

  alert(
    "Copied these tasks to every other day in this month."
  );
});


// ==========================================
// 12. REMINDERS
// ==========================================

// Reminders work while this page is open
// and the browser allows its timer to run.
// They are not guaranteed when Chrome is closed.

function checkAlarms() {

  if (!currentUser) return;

  const now = new Date();

  const minuteKey =
    `${todayKey()}-${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (minuteKey === lastAlarmMinute) return;

  lastAlarmMinute = minuteKey;

  const key = todayKey();

  const tasks = allTasks[key] || [];

  let changed = false;

  tasks.forEach((task) => {

    const currentTime =
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (
      task.time === currentTime &&
      !task.alarmFired &&
      !task.done
    ) {

      task.alarmFired = true;
      changed = true;

      const message = `It's time for: ${task.text}`;

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {

        new Notification(
          "Monthly Planner reminder",
          { body: message }
        );

      } else {

        alert(message);
      }
    }
  });

  if (changed) {
    saveDay(key);
  }
}

setInterval(checkAlarms, 10000);
