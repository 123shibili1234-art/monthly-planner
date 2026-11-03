
// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const monthYear = document.getElementById("monthYear");
const calendarDays = document.getElementById("calendarDays");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

const selectedDateText = document.getElementById("selectedDateText");
const taskInput = document.getElementById("taskInput");
const taskTime = document.getElementById("taskTime");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

const copyTasksBtn = document.getElementById("copyTasksBtn");
const pasteTasksBtn = document.getElementById("pasteTasksBtn");
const copyMonthBtn = document.getElementById("copyMonthBtn");

// ==========================================
// 2. DATE VARIABLES
// ==========================================

let currentDate = new Date();

let selectedDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
);

let copiedTasks = [];

// ==========================================
// 3. LOAD SAVED TASKS
// ==========================================

let tasks = {};

try {
    tasks = JSON.parse(localStorage.getItem("plannerTasks")) || {};
} catch (error) {
    tasks = {};
}

// Give old tasks the new properties they need.
Object.keys(tasks).forEach(dateKey => {
    tasks[dateKey] = tasks[dateKey].map(task => ({
        id: task.id || createId(),
        text: task.text || "",
        completed: Boolean(task.completed),
        time: task.time || "",
        reminderEnabled: task.reminderEnabled ?? Boolean(task.time),
        alarmFired: Boolean(task.alarmFired),
        subtasks: Array.isArray(task.subtasks)
            ? task.subtasks.map(subtask => ({
                id: subtask.id || createId(),
                text: subtask.text || "",
                completed: Boolean(subtask.completed)
            }))
            : []
    }));
});

saveTasks();

// ==========================================
// 4. CREATE UNIQUE ID
// ==========================================

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ==========================================
// 5. DATE KEY
// ==========================================

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// ==========================================
// 6. SAVE TASKS
// ==========================================

function saveTasks() {
    localStorage.setItem("plannerTasks", JSON.stringify(tasks));
}

// ==========================================
// 7. COPY TASKS SAFELY
// ==========================================

function cloneTasks(taskArray) {
    return taskArray.map(task => ({
        id: createId(),
        text: task.text,
        completed: false,
        time: task.time || "",
        reminderEnabled: Boolean(task.reminderEnabled),
        alarmFired: false,
        subtasks: (task.subtasks || []).map(subtask => ({
            id: createId(),
            text: subtask.text,
            completed: false
        }))
    }));
}

// ==========================================
// 8. RENDER CALENDAR
// ==========================================

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
    );

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.classList.add("empty");
        calendarDays.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateBox = document.createElement("div");
        dateBox.textContent = day;

        const dateKey = getDateKey(
            new Date(year, month, day)
        );

        if (
            day === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear()
        ) {
            dateBox.classList.add("selected");
        }

        if (tasks[dateKey] && tasks[dateKey].length > 0) {
            dateBox.style.borderBottom = "3px solid #a78bfa";
        }

        dateBox.addEventListener("click", function() {
            selectedDate = new Date(year, month, day);
            renderCalendar();
            renderTasks();
        });

        calendarDays.appendChild(dateBox);
    }
}

// ==========================================
// 9. DISPLAY TASKS AND SUBTASKS
// ==========================================

function renderTasks() {
    const dateKey = getDateKey(selectedDate);

    selectedDateText.textContent = selectedDate.toDateString();

    taskList.innerHTML = "";

    const dailyTasks = tasks[dateKey] || [];

    dailyTasks.forEach(function(task) {

        const taskItem = document.createElement("div");
        taskItem.classList.add("task-item");

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        // MAIN TASK CHECKBOX
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;

        checkbox.addEventListener("change", function() {
            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        // MAIN TASK TEXT
        const taskText = document.createElement("span");
        taskText.textContent = task.text;

        // TASK TIME
        if (task.time) {
            const timeLabel = document.createElement("small");
            timeLabel.classList.add("task-time");
            timeLabel.textContent = "⏰ " + task.time;
            taskItem.appendChild(timeLabel);
        }

        // DELETE BUTTON
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.classList.add("delete-task");
        deleteBtn.title = "Delete task";

        deleteBtn.addEventListener("click", function() {
            tasks[dateKey] = tasks[dateKey].filter(
                item => item.id !== task.id
            );

            if (tasks[dateKey].length === 0) {
                delete tasks[dateKey];
            }

            saveTasks();
            renderCalendar();
            renderTasks();
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteBtn);

        taskList.appendChild(taskItem);

        // SUBTASK SECTION
        const subtaskSection = document.createElement("div");
        subtaskSection.classList.add("subtask-section");

        task.subtasks.forEach(function(subtask) {
            const subtaskItem = document.createElement("div");
            subtaskItem.classList.add("subtask-item");

            if (subtask.completed) {
                subtaskItem.classList.add("completed");
            }

            const subCheckbox = document.createElement("input");
            subCheckbox.type = "checkbox";
            subCheckbox.checked = subtask.completed;

            subCheckbox.addEventListener("change", function() {
                subtask.completed = subCheckbox.checked;
                saveTasks();
                renderTasks();
            });

            const subText = document.createElement("span");
            subText.textContent = subtask.text;

            const subDelete = document.createElement("button");
            subDelete.textContent = "×";
            subDelete.classList.add("delete-task");

            subDelete.addEventListener("click", function() {
                task.subtasks = task.subtasks.filter(
                    item => item.id !== subtask.id
                );

                saveTasks();
                renderTasks();
            });

            subtaskItem.appendChild(subCheckbox);
            subtaskItem.appendChild(subText);
            subtaskItem.appendChild(subDelete);

            subtaskSection.appendChild(subtaskItem);
        });

        // ADD SUBTASK INPUT
        const subtaskInput = document.createElement("input");
        subtaskInput.type = "text";
        subtaskInput.placeholder = "Enter a subtask...";
        subtaskInput.maxLength = 150;

        const addSubtaskBtn = document.createElement("button");
        addSubtaskBtn.textContent = "+ Add subtask";

        function addSubtask() {
            const text = subtaskInput.value.trim();

            if (!text) return;

            task.subtasks.push({
                id: createId(),
                text: text,
                completed: false
            });

            saveTasks();
            renderTasks();
        }

        addSubtaskBtn.addEventListener("click", addSubtask);

        subtaskInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                addSubtask();
            }
        });

        const subtaskInputArea = document.createElement("div");
        subtaskInputArea.classList.add("subtask-input");

        subtaskInputArea.appendChild(subtaskInput);
        subtaskInputArea.appendChild(addSubtaskBtn);

        subtaskSection.appendChild(subtaskInputArea);
        taskList.appendChild(subtaskSection);
    });

    // PROGRESS
    const completedTasks = dailyTasks.filter(
        task => task.completed
    ).length;

    const totalTasks = dailyTasks.length;

    progressText.textContent =
        `${completedTasks} of ${totalTasks} main tasks completed`;

    const percentage = totalTasks === 0
        ? 0
        : (completedTasks / totalTasks) * 100;

    progressFill.style.width = percentage + "%";
}

// ==========================================
// 10. ADD MAIN TASK
// ==========================================

function addTask() {
    const text = taskInput.value.trim();
    const time = taskTime.value;

    if (!text) {
        alert("Please enter a task!");
        return;
    }

    const dateKey = getDateKey(selectedDate);

    if (!tasks[dateKey]) {
        tasks[dateKey] = [];
    }

    tasks[dateKey].push({
        id: createId(),
        text: text,
        completed: false,
        time: time,
        reminderEnabled: Boolean(time),
        alarmFired: false,
        subtasks: []
    });

    taskInput.value = "";
    taskTime.value = "";

    saveTasks();
    renderCalendar();
    renderTasks();

    // Request notification permission after user interaction.
    if (
        time &&
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        Notification.requestPermission();
    }
}

addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        addTask();
    }
});

// ==========================================
// 11. COPY ONE DAY'S TASKS
// ==========================================

copyTasksBtn.addEventListener("click", function() {
    const dateKey = getDateKey(selectedDate);

    copiedTasks = cloneTasks(tasks[dateKey] || []);

    if (copiedTasks.length === 0) {
        alert("There are no tasks to copy!");
        return;
    }

    alert("Tasks copied! Select another date and press Paste Day.");
});

// ==========================================
// 12. PASTE TASKS INTO ANOTHER DAY
// ==========================================

pasteTasksBtn.addEventListener("click", function() {
    if (copiedTasks.length === 0) {
        alert("Copy a day's tasks first!");
        return;
    }

    const dateKey = getDateKey(selectedDate);

    if (!confirm("Add the copied tasks to this date?")) {
        return;
    }

    if (!tasks[dateKey]) {
        tasks[dateKey] = [];
    }

    tasks[dateKey].push(...cloneTasks(copiedTasks));

    saveTasks();
    renderCalendar();
    renderTasks();
});

// ==========================================
// 13. COPY TASKS TO EVERY DAY OF MONTH
// ==========================================

copyMonthBtn.addEventListener("click", function() {
    const sourceKey = getDateKey(selectedDate);
    const sourceTasks = tasks[sourceKey] || [];

    if (sourceTasks.length === 0) {
        alert("There are no tasks to copy!");
        return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const confirmed = confirm(
        "Copy these tasks to every OTHER day of this month? Existing tasks will be kept."
    );

    if (!confirmed) return;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = getDateKey(
            new Date(year, month, day)
        );

        if (dateKey === sourceKey) continue;

        if (!tasks[dateKey]) {
            tasks[dateKey] = [];
        }

        tasks[dateKey].push(...cloneTasks(sourceTasks));
    }

    saveTasks();
    renderCalendar();
    renderTasks();

    alert("Tasks copied to the other days of this month!");
});

// ==========================================
// 14. PREVIOUS MONTH
// ==========================================

prevMonth.addEventListener("click", function() {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
    );

    selectedDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    );

    renderCalendar();
    renderTasks();
});

// ==========================================
// 15. NEXT MONTH
// ==========================================

nextMonth.addEventListener("click", function() {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
    );

    selectedDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    );

    renderCalendar();
    renderTasks();
});

// ==========================================
// 16. ALARM SOUND
// ==========================================

let audioContext = null;

function playAlarm() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        audioContext.resume().then(() => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = 880;

            gain.gain.value = 0.2;

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start();

            setTimeout(() => {
                oscillator.stop();
            }, 700);
        });

    } catch (error) {
        console.log("Alarm sound could not play:", error);
    }
}

// ==========================================
// 17. CHECK TASK REMINDERS
// ==========================================

function checkAlarms() {
    const now = new Date();
    const todayKey = getDateKey(now);

    const todayTasks = tasks[todayKey] || [];

    todayTasks.forEach(function(task) {
        if (
            !task.time ||
            !task.reminderEnabled ||
            task.alarmFired
        ) {
            return;
        }

        const [hours, minutes] = task.time.split(":").map(Number);

        const targetTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes,
            0
        );

        const difference = now.getTime() - targetTime.getTime();

        // Trigger during the first minute after the selected time.
        if (difference >= 0 && difference < 60000) {
            task.alarmFired = true;

            saveTasks();
            playAlarm();

            if (
                "Notification" in window &&
                Notification.permission === "granted"
            ) {
                new Notification("Monthly Planner Reminder", {
                    body: task.text,
                    tag: task.id
                });
            } else {
                alert("⏰ REMINDER: " + task.text);
            }
        }
    });
}

// Check every 15 seconds while the page is open.
setInterval(checkAlarms, 15000);

// ==========================================
// 18. START WEBSITE
// ==========================================

renderCalendar();
renderTasks();
