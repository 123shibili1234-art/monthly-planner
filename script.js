
// 1. GET HTML ELEMENTS
const monthYear = document.getElementById("monthYear");
const calendarDays = document.getElementById("calendarDays");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

const selectedDateText = document.getElementById("selectedDateText");
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

// 2. DATE VARIABLES
let currentDate = new Date();

let selectedDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
);

// 3. LOAD SAVED TASKS
let tasks = {};

try {
    tasks = JSON.parse(localStorage.getItem("plannerTasks")) || {};
} catch (error) {
    tasks = {};
}

// 4. CREATE DATE KEY
function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// 5. SAVE TASKS
function saveTasks() {
    localStorage.setItem("plannerTasks", JSON.stringify(tasks));
}

// 6. RENDER CALENDAR
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarDays.innerHTML = "";

    // Empty spaces before the first day
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.classList.add("empty");
        calendarDays.appendChild(emptyDay);
    }

    // Create calendar dates
    for (let day = 1; day <= daysInMonth; day++) {
        const dateBox = document.createElement("div");

        dateBox.textContent = day;

        const dateKey = getDateKey(new Date(year, month, day));

        // Highlight selected date
        if (
            day === selectedDate.getDate() &&
            month === selectedDate.getMonth() &&
            year === selectedDate.getFullYear()
        ) {
            dateBox.classList.add("selected");
        }

        // Show marker when a date has tasks
        if (tasks[dateKey] && tasks[dateKey].length > 0) {
            dateBox.style.borderBottom = "3px solid #a78bfa";
        }

        // Select a date
        dateBox.addEventListener("click", function() {
            selectedDate = new Date(year, month, day);

            renderCalendar();
            renderTasks();
        });

        calendarDays.appendChild(dateBox);
    }
}

// 7. DISPLAY TASKS WITH CHECKBOXES
function renderTasks() {
    const dateKey = getDateKey(selectedDate);

    selectedDateText.textContent = selectedDate.toDateString();

    taskList.innerHTML = "";

    const dailyTasks = tasks[dateKey] || [];

    dailyTasks.forEach(function(task, index) {
        const taskItem = document.createElement("div");

        taskItem.classList.add("task-item");

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        // CHECKBOX
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Mark task as completed");

        checkbox.addEventListener("change", function() {
            task.completed = checkbox.checked;

            saveTasks();
            renderTasks();
        });

        // TASK TEXT
        const taskText = document.createElement("span");

        taskText.textContent = task.text;

        // DELETE BUTTON
        const deleteBtn = document.createElement("button");

        deleteBtn.textContent = "×";
        deleteBtn.classList.add("delete-task");
        deleteBtn.title = "Delete task";

        deleteBtn.addEventListener("click", function() {
            tasks[dateKey].splice(index, 1);

            if (tasks[dateKey].length === 0) {
                delete tasks[dateKey];
            }

            saveTasks();
            renderCalendar();
            renderTasks();
        });

        // ADD EVERYTHING TO TASK ITEM
        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskText);
        taskItem.appendChild(deleteBtn);

        taskList.appendChild(taskItem);
    });

    // 8. UPDATE PROGRESS
    const completedTasks = dailyTasks.filter(
        task => task.completed
    ).length;

    const totalTasks = dailyTasks.length;

    progressText.textContent =
        `${completedTasks} of ${totalTasks} completed`;

    const percentage = totalTasks === 0
        ? 0
        : (completedTasks / totalTasks) * 100;

    progressFill.style.width = percentage + "%";
}

// 9. ADD TASK
function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === "") {
        alert("Please enter a task!");
        return;
    }

    const dateKey = getDateKey(selectedDate);

    if (!tasks[dateKey]) {
        tasks[dateKey] = [];
    }

    tasks[dateKey].push({
        text: taskText,
        completed: false
    });

    taskInput.value = "";

    saveTasks();
    renderCalendar();
    renderTasks();
}

// ADD BUTTON
addTaskBtn.addEventListener("click", addTask);

// PRESS ENTER TO ADD TASK
taskInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        addTask();
    }
});

// 10. PREVIOUS MONTH
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

// 11. NEXT MONTH
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

// 12. START WEBSITE
renderCalendar();
renderTasks();
