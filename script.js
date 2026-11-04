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
      renderCalendar();
    });

    const title = document.createElement("span");

    title.className =
      `task-title${task.done ? " done" : ""}`;

    title.textContent = task.text;

    const time = document.createElement("span");

    time.className = "task-time";

    time.textContent =
      task.time ? `◷ ${task.time}` : "";

    // EDIT MAIN TASK
    const edit = document.createElement("button");

    edit.type = "button";
    edit.className = "edit-btn";
    edit.textContent = "✎";
    edit.title = "Rename task";

    edit.style.background = "transparent";
    edit.style.border = "none";
    edit.style.color = "#b58cff";
    edit.style.cursor = "pointer";
    edit.style.fontSize = "18px";

    edit.addEventListener("click", () => {

      const updatedText = prompt(
        "Enter the new task name:",
        task.text
      );

      if (updatedText === null) return;

      const cleanedText = updatedText.trim();

      if (!cleanedText) {
        alert("Task name cannot be empty.");
        return;
      }

      task.text = cleanedText;

      saveDay(key);
      renderTasks();
      renderCalendar();
    });

    // DELETE MAIN TASK
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
      edit,
      remove
    );

    item.appendChild(main);

    // HIDE SUBTASKS WHEN EVERYTHING IS COMPLETE
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

          const allSubtasksDone =
            task.subtasks.length > 0 &&
            task.subtasks.every((entry) => entry.done);

          if (allSubtasksDone && !task.done) {
            showSubtaskCompletionNotice(task.text);
          }

          saveDay(key);
          renderCalendar();
          renderTasks();
        });

        const subText = document.createElement("span");

        subText.textContent = sub.text;

        // EDIT SUBTASK
        const subEdit = document.createElement("button");

        subEdit.type = "button";
        subEdit.className = "edit-btn";
        subEdit.textContent = "✎";
        subEdit.title = "Rename subtask";

        subEdit.style.background = "transparent";
        subEdit.style.border = "none";
        subEdit.style.color = "#b58cff";
        subEdit.style.cursor = "pointer";
        subEdit.style.fontSize = "16px";

        subEdit.addEventListener("click", (event) => {

          event.preventDefault();
          event.stopPropagation();

          const updatedText = prompt(
            "Enter the new subtask name:",
            sub.text
          );

          if (updatedText === null) return;

          const cleanedText = updatedText.trim();

          if (!cleanedText) {
            alert("Subtask name cannot be empty.");
            return;
          }

          sub.text = cleanedText;

          saveDay(key);
          renderTasks();
          renderCalendar();
        });

        // DELETE SUBTASK
        const subDelete = document.createElement("button");

        subDelete.type = "button";
        subDelete.className = "delete-btn";
        subDelete.textContent = "×";

        subDelete.addEventListener("click", (event) => {

          event.preventDefault();
          event.stopPropagation();

          task.subtasks = task.subtasks.filter(
            (entry) => entry.id !== sub.id
          );

          saveDay(key);
          renderCalendar();
          renderTasks();
        });

        row.append(
          subCheck,
          subText,
          subEdit,
          subDelete
        );

        subArea.appendChild(row);
      });

      // ADD NEW SUBTASK
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
        renderCalendar();
        renderTasks();
      });

      subArea.appendChild(addRow);

      item.appendChild(subArea);
    }

    list.appendChild(item);
  });
}