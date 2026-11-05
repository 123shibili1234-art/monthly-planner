
// =============================================
// MONTHLY PLANNER — COMPLETE FIREBASE SCRIPT
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// =============================================
// 1. FIREBASE CONFIGURATION
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyDu-EMbTgofefauQcvhjaX_tJlMKy73Ix0",
  authDomain: "monthly-planner-aec01.firebaseapp.com",
  projectId: "monthly-planner-aec01",
  storageBucket: "monthly-planner-aec01.firebasestorage.app",
  messagingSenderId: "891235625473",
  appId: "1:891235625473:web:5ef5d8bc1e72d2d9c92e00",
  measurementId: "G-37X6B5LCQL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =============================================
// 2. ELEMENTS AND VARIABLES
// =============================================

const $ = id => document.getElementById(id);

let currentUser = null;
let isSignup = false;

let selectedDate = new Date();
let displayedMonth = new Date();

let allTasks = {};
let copiedTasks = [];

selectedDate.setHours(0, 0, 0, 0);
displayedMonth.setDate(1);
displayedMonth.setHours(0, 0, 0, 0);

// =============================================
// 3. HELPER FUNCTIONS
// =============================================

function usernameToEmail(username) {
  return `${username.toLowerCase()}@monthly-planner-aec01.firebaseapp.com`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function isFullyComplete(task) {
  if (task.done) return true;

  const subtasks = Array.isArray(task.subtasks)
    ? task.subtasks
    : [];

  return subtasks.length > 0 &&
    subtasks.every(sub => sub.done);
}

function escapeMessage(error) {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use":
      "This username already has an account. Please log in.",

    "auth/invalid-email":
      "Please enter a valid username.",

    "auth/weak-password":
      "Your password must contain at least 6 characters.",

    "auth/user-not-found":
      "No account found with this username. Create an account first.",

    "auth/wrong-password":
      "Incorrect password. Please try again.",

    "auth/invalid-credential":
      "Incorrect username or password.",

    "auth/too-many-requests":
      "Too many attempts. Please wait and try again.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/operation-not-allowed":
      "Enable Email/Password in Firebase Authentication.",

    "auth/unauthorized-domain":
      "Add your website domain to Firebase authorized domains.",

    "permission-denied":
      "Firestore access denied. Check your Firestore rules."
  };

  return messages[code] ||
    error?.message ||
    "Something went wrong. Please try again.";
}

function setAuthMessage(message, isError = true) {
  $("authMessage").textContent = message;

  $("authMessage").style.color =
    isError ? "#f0a5a5" : "#a7f3d0";
}

// =============================================
// 4. LOGIN AND SIGNUP
// =============================================

function setAuthMode(signup) {
  isSignup = signup;

  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);

  $("authSubmit").textContent =
    signup ? "Create account" : "Log in";

  $("passwordInput").autocomplete =
    signup ? "new-password" : "current-password";

  setAuthMessage("");
}

$("loginTab").addEventListener("click", () => {
  setAuthMode(false);
});

$("signupTab").addEventListener("click", () => {
  setAuthMode(true);
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const username =
    $("usernameInput").value.trim().toLowerCase();

  const password = $("passwordInput").value;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    setAuthMessage(
      "Username must be 3–20 characters and use only letters, numbers or underscores."
    );
    return;
  }

  if (password.length < 6) {
    setAuthMessage(
      "Your password must contain at least 6 characters."
    );
    return;
  }

  const button = $("authSubmit");

  button.disabled = true;
  button.textContent =
    isSignup ? "Creating account..." : "Logging in...";

  setAuthMessage("");

  try {
    const email = usernameToEmail(username);

    if (isSignup) {
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
    setAuthMessage(escapeMessage(error));

  } finally {
    button.disabled = false;

    button.textContent =
      isSignup ? "Create account" : "Log in";
  }
});

// =============================================
// 5. FIRESTORE LOAD AND SAVE
// =============================================

async function loadAllTasks() {
  allTasks = {};

  const daysRef = collection(
    db,
    "users",
    currentUser.uid,
    "days"
  );

  const snapshot = await getDocs(daysRef);

  snapshot.forEach(dayDoc => {
    const data = dayDoc.data();

    allTasks[dayDoc.id] =
      Array.isArray(data.tasks) ? data.tasks : [];
  });
}

async function saveDay(key) {
  if (!currentUser) return;

  try {
    const dayRef = doc(
      db,
      "users",
      currentUser.uid,
      "days",
      key
    );

    await setDoc(dayRef, {
      tasks: allTasks[key] || [],
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Could not save tasks:", error);

    alert(
      "Your changes could not be saved. Check your internet connection and Firestore rules."
    );
  }
}

// =============================================
// 6. AUTHENTICATION STATE
// =============================================

function showPlanner(user) {
  currentUser = user;

  $("authScreen").classList.add("hidden");
  $("plannerApp").classList.remove("hidden");

  $("welcomeUser").textContent =
    user.displayName || user.email.split("@")[0];
}

function showLogin() {
  currentUser = null;
  allTasks = {};

  $("plannerApp").classList.add("hidden");
  $("authScreen").classList.remove("hidden");

  $("welcomeUser").textContent = "";
}

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    showPlanner(user);

    try {
      await loadAllTasks();

      renderCalendar();
      renderTasks();

    } catch (error) {
      console.error("Task loading failed:", error);

      alert(
        "You are logged in, but your tasks could not be loaded. Check Firestore rules."
      );
    }

  } else {
    showLogin();
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(escapeMessage(error));
  }
});

// =============================================
// 7. CALENDAR
// =============================================

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  $("monthYear").textContent =
    displayedMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });

  const firstDay = new Date(year, month, 1).getDay();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selectedDate);

  const calendar = $("calendarDays");

  calendar.replaceChildren();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");

    blank.className = "day muted";
    blank.setAttribute("aria-hidden", "true");

    calendar.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);

    const tasks = allTasks[key] || [];

    const hasTasks = tasks.length > 0;

    const hasIncomplete =
      tasks.some(task => !isFullyComplete(task));

    const button = document.createElement("button");

    button.type = "button";
    button.className = "day";
    button.textContent = day;

    if (key === todayKey) {
      button.classList.add("today");
    }

    if (key === selectedKey) {
      button.classList.add("selected");
    }

    if (hasTasks) {
      button.classList.add("has-tasks");
    }

    // RED ONLY FOR PAST DAYS WITH INCOMPLETE TASKS
    if (key < todayKey && hasIncomplete) {
      button.classList.add("has-incomplete");
    }

    button.setAttribute(
      "aria-label",
      `${date.toDateString()}${hasTasks ? `, ${tasks.length} tasks` : ""}`
    );

    button.addEventListener("click", () => {
      selectedDate = date;

      renderCalendar();
      renderTasks();
    });

    calendar.appendChild(button);
  }
}

$("prevMonth").addEventListener("click", () => {
  displayedMonth.setMonth(displayedMonth.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  displayedMonth.setMonth(displayedMonth.getMonth() + 1);
  renderCalendar();
});

// =============================================
// 8. ADD TASK
// =============================================

$("taskForm").addEventListener("submit", async event => {
  event.preventDefault();

  const text = $("taskInput").value.trim();
  const time = $("taskTime").value;

  if (!text || !currentUser) return;

  const key = dateKey(selectedDate);

  if (!allTasks[key]) {
    allTasks[key] = [];
  }

  allTasks[key].push({
    id: makeId(),
    text,
    time,
    done: false,
    subtasks: []
  });

  $("taskInput").value = "";
  $("taskTime").value = "";

  renderCalendar();
  renderTasks();

  await saveDay(key);
});

// =============================================
// 9. DISPLAY TASKS AND SUBTASKS
// =============================================

function renderTasks() {
  if (!currentUser) return;

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
    tasks.filter(isFullyComplete).length;

  const percent = tasks.length
    ? Math.round(doneCount / tasks.length * 100)
    : 0;

  $("progressText").textContent =
    `${doneCount} of ${tasks.length} completed`;

  $("remainingText").textContent =
    tasks.length - doneCount
      ? `${tasks.length - doneCount} left`
      : (tasks.length ? "All done!" : "");

  $("progressFill").style.width = `${percent}%`;

  $("progressRing").style.setProperty(
    "--progress",
    `${percent}%`
  );

  $("progressPercent").textContent = `${percent}%`;

  const list = $("taskList");

  list.replaceChildren();

  $("emptyState").classList.toggle(
    "hidden",
    tasks.length > 0
  );

  tasks.forEach(task => {
    if (!Array.isArray(task.subtasks)) {
      task.subtasks = [];
    }

    const item = document.createElement("article");

    item.className = "task-item";

    const main = document.createElement("div");

    main.className = "task-main";

    // TASK CHECKBOX
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = !!task.done;

    checkbox.setAttribute(
      "aria-label",
      `Complete ${task.text}`
    );

    checkbox.addEventListener("change", async () => {
      task.done = checkbox.checked;

      renderTasks();
      renderCalendar();

      await saveDay(key);
    });

    // TASK NAME
    const title = document.createElement("span");

    title.className =
      `task-title${task.done ? " done" : ""}`;

    title.textContent = task.text;

    // TASK TIME
    const time = document.createElement("span");

    time.className = "task-time";

    time.textContent = task.time
      ? `◷ ${task.time}`
      : "";

    // EDIT TASK BUTTON
    const edit = document.createElement("button");

    edit.type = "button";
    edit.className = "edit-btn";
    edit.textContent = "Edit Task";
    edit.title = "Rename task";

    edit.style.cssText =
      "background:#352044;border:1px solid #9b55d5;color:#e9d5ff;cursor:pointer;font-size:12px;padding:6px 9px;border-radius:7px;white-space:nowrap";

    edit.addEventListener("click", async () => {
      const updated = prompt(
        "Enter the new task name:",
        task.text
      );

      if (updated === null) return;

      const cleaned = updated.trim();

      if (!cleaned) {
        alert("Task name cannot be empty.");
        return;
      }

      task.text = cleaned;

      renderTasks();

      await saveDay(key);
    });

    // DELETE TASK BUTTON
    const remove = document.createElement("button");

    remove.type = "button";
    remove.className = "delete-btn";
    remove.textContent = "×";

    remove.setAttribute("aria-label", "Delete task");

    remove.addEventListener("click", async () => {
      if (!confirm(
        `Delete "${task.text}" and its subtasks?`
      )) return;

      allTasks[key] =
        tasks.filter(entry => entry.id !== task.id);

      renderCalendar();
      renderTasks();

      await saveDay(key);
    });

    main.append(
      checkbox,
      title,
      time,
      edit,
      remove
    );

    item.appendChild(main);

    // =========================================
    // SUBTASKS
    // =========================================

    if (!isFullyComplete(task)) {
      const subArea = document.createElement("div");

      subArea.className = "subtask-area";

      task.subtasks.forEach(sub => {
        const row = document.createElement("div");

        row.className =
          `subtask${sub.done ? " done" : ""}`;

        // SUBTASK CHECKBOX
        const subCheck = document.createElement("input");

        subCheck.type = "checkbox";
        subCheck.checked = !!sub.done;

        subCheck.setAttribute(
          "aria-label",
          `Complete ${sub.text}`
        );

        subCheck.addEventListener("change", async () => {
          sub.done = subCheck.checked;

          renderCalendar();
          renderTasks();

          await saveDay(key);
        });

        // SUBTASK NAME
        const subText = document.createElement("span");

        subText.textContent = sub.text;

        // EDIT SUBTASK BUTTON
        const subEdit = document.createElement("button");

        subEdit.type = "button";
        subEdit.className = "edit-btn";
        subEdit.textContent = "Edit Subtask";
        subEdit.title = "Rename subtask";

        subEdit.style.cssText =
          "background:#352044;border:1px solid #9b55d5;color:#e9d5ff;cursor:pointer;font-size:11px;padding:5px 8px;border-radius:7px;white-space:nowrap";

        subEdit.addEventListener("click", async () => {
          const updated = prompt(
            "Enter the new subtask name:",
            sub.text
          );

          if (updated === null) return;

          const cleaned = updated.trim();

          if (!cleaned) {
            alert("Subtask name cannot be empty.");
            return;
          }

          sub.text = cleaned;

          renderTasks();

          await saveDay(key);
        });

        // DELETE SUBTASK BUTTON
        const subDelete = document.createElement("button");

        subDelete.type = "button";
        subDelete.className = "delete-btn";
        subDelete.textContent = "×";

        subDelete.setAttribute(
          "aria-label",
          "Delete subtask"
        );

        subDelete.addEventListener("click", async () => {
          task.subtasks =
            task.subtasks.filter(entry => entry.id !== sub.id);

          renderCalendar();
          renderTasks();

          await saveDay(key);
        });

        row.append(
          subCheck,
          subText,
          subEdit,
          subDelete
        );

        subArea.appendChild(row);
      });

      // ADD SUBTASK FORM
      const addRow = document.createElement("form");

      addRow.className = "subtask-add";

      const input = document.createElement("input");

      input.placeholder = "Add a subtask...";
      input.maxLength = 120;

      input.setAttribute(
        "aria-label",
        "New subtask"
      );

      input.required = true;

      const add = document.createElement("button");

      add.type = "submit";
      add.textContent = "+";

      add.setAttribute(
        "aria-label",
        "Add subtask"
      );

      addRow.append(input, add);

      addRow.addEventListener("submit", async event => {
        event.preventDefault();

        const subText = input.value.trim();

        if (!subText) return;

        task.subtasks.push({
          id: makeId(),
          text: subText,
          done: false
        });

        renderCalendar();
        renderTasks();

        await saveDay(key);
      });

      subArea.appendChild(addRow);

      item.appendChild(subArea);
    }

    list.appendChild(item);
  });
}

// =============================================
// 10. COPY AND PASTE DAY
// =============================================

$("copyTasksBtn").addEventListener("click", () => {
  const key = dateKey(selectedDate);

  copiedTasks = JSON.parse(
    JSON.stringify(allTasks[key] || [])
  );

  alert(
    copiedTasks.length
      ? `Copied ${copiedTasks.length} task(s).`
      : "There are no tasks to copy."
  );
});

$("pasteTasksBtn").addEventListener("click", async () => {
  if (!copiedTasks.length) {
    alert("Copy a day with tasks first.");
    return;
  }

  const key = dateKey(selectedDate);

  const cloned = JSON.parse(
    JSON.stringify(copiedTasks)
  );

  cloned.forEach(task => {
    task.id = makeId();

    (task.subtasks || []).forEach(sub => {
      sub.id = makeId();
    });
  });

  allTasks[key] = [
    ...(allTasks[key] || []),
    ...cloned
  ];

  renderCalendar();
  renderTasks();

  await saveDay(key);
});

// =============================================
// 11. COPY TASKS TO THE MONTH
// =============================================

$("copyMonthBtn").addEventListener("click", async () => {
  const sourceKey = dateKey(selectedDate);

  const sourceTasks = allTasks[sourceKey] || [];

  if (!sourceTasks.length) {
    alert("There are no tasks on the selected day to copy.");
    return;
  }

  const monthName =
    displayedMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });

  if (!confirm(
    `Copy these ${sourceTasks.length} task(s) to every other day in ${monthName}? Existing tasks on other days will be kept.`
  )) return;

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  const count =
    new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);

    if (key === sourceKey) continue;

    const copies = JSON.parse(
      JSON.stringify(sourceTasks)
    );

    copies.forEach(task => {
      task.id = makeId();
      task.done = false;

      (task.subtasks || []).forEach(sub => {
        sub.id = makeId();
        sub.done = false;
      });
    });

    allTasks[key] = [
      ...(allTasks[key] || []),
      ...copies
    ];

    await saveDay(key);
  }

  renderCalendar();

  alert("Tasks copied to the rest of the month!");
});

// =============================================
// 12. INITIAL DISPLAY
// =============================================

renderCalendar();
renderTasks();
