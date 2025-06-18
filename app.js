// ==========================
// Jarvis Personal AI Assistant App
// ==========================

const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverviewEl = document.getElementById("budgetOverview"); // Renamed for clarity
const budgetChartCtx = document.getElementById("budgetChart").getContext("2d"); // Renamed for clarity
const currentBudgetGoalEl = document.getElementById("currentBudgetGoal");
const budgetSummaryEl = document.getElementById("budgetSummary");
const recentTransactionsList = document.getElementById("recentTransactionsList");
const dailyRecommendationText = document.getElementById("dailyRecommendationText");

// Manual Entry Elements
const newTaskText = document.getElementById("newTaskText");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const newTaskCategory = document.getElementById("newTaskCategory");
const addTaskBtn = document.getElementById("addTaskBtn");

const newNoteText = document.getElementById("newNoteText");
const newNoteCategory = document.getElementById("newNoteCategory");
const addNoteBtn = document.getElementById("addNoteBtn");

const transactionAmount = document.getElementById("transactionAmount");
const transactionDescription = document.getElementById("transactionDescription");
const transactionCategory = document.getElementById("transactionCategory");
const transactionType = document.getElementById("transactionType");
const addTransactionBtn = document.getElementById("addTransactionBtn");

const monthlyBudgetGoalInput = document.getElementById("monthlyBudgetGoal");
const setBudgetGoalBtn = document.getElementById("setBudgetGoalBtn");

const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

// Data Management Buttons
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataInput = document.getElementById("importDataInput");
const importDataBtn = document.getElementById("importDataBtn");
const clearAllDataBtn = document.getElementById("clearAllDataBtn");

let recognition;
let listening = false;
let currentTheme = 'dark'; // Default to dark theme as per new CSS

// --- Data Structures (now persisted) ---
let tasks = [];
let notes = [];
let transactions = []; // New array to store all transactions
let budgetGoal = 0; // New variable for monthly budget goal

// --- Gamification state persisted ---
const STORAGE_KEYS = {
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  TRANSACTIONS: "jarvis_transactions",
  BUDGET_GOAL: "jarvis_budget_goal",
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
};

// --- Load data from localStorage ---
function loadData() {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
  notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [];
  transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  budgetGoal = parseFloat(localStorage.getItem(STORAGE_KEYS.BUDGET_GOAL)) || 0;

  // Gamification data
  streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
  lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
  points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
  badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];
}

// --- Save data to localStorage ---
function saveTasks() { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }
function saveNotes() { localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes)); }
function saveTransactions() { localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)); }
function saveBudgetGoal() { localStorage.setItem(STORAGE_KEYS.BUDGET_GOAL, budgetGoal); }
function saveGamification() {
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

// --- Gamification Functions ---
let streak = 0;
let lastCompletionDate = null;
let points = 0;
let badges = [];

function updateGamificationUI() {
  streakCountEl.textContent = streak;
  pointsCountEl.textContent = points;

  badgesEl.innerHTML = '';
  badges.forEach(badge => {
    const badgeEl = document.createElement("span");
    badgeEl.classList.add("badge");
    badgeEl.textContent = badge;
    badgesEl.appendChild(badgeEl);
  });
  saveGamification();
}

function checkAndUpdateStreak() {
  const today = new Date().toDateString();

  if (!lastCompletionDate) {
    streak = 1;
  } else {
    const lastDate = new Date(lastCompletionDate);
    const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      streak = 1; // streak broken, reset
    }
  }
  lastCompletionDate = today;
  saveGamification();
}

function addPoints(value) {
  points += value;
  checkBadges();
  saveGamification();
}

function checkBadges() {
  if (points >= 50 && !badges.includes("Productivity Pro")) {
    badges.push("Productivity Pro");
  }
  if (streak >= 5 && !badges.includes("5-Day Streak")) {
    badges.push("5-Day Streak");
  }
  if (streak >= 10 && !badges.includes("10-Day Streak")) {
    badges.push("10-Day Streak");
  }
  if (tasks.every(t => t.completed) && tasks.length > 0 && !badges.includes("All Tasks Done")) {
    badges.push("All Tasks Done");
  }
  saveGamification();
}

// --- Task Management Functions ---
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function renderTasks() {
  taskList.innerHTML = "";
  const today = new Date().toISOString().split('T')[0];

  // Sort tasks by due date, then by completion status
  const sortedTasks = [...tasks].sort((a, b) => {
    // Incomplete tasks before completed ones
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    // Then by due date
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  sortedTasks.forEach(task => {
    const li = document.createElement("li");
    li.dataset.id = task.id; // Store ID for easy reference

    const taskContentSpan = document.createElement("span");
    taskContentSpan.classList.add("item-content");
    taskContentSpan.innerHTML = `
        ${task.text}
        <span class="task-meta">Due: ${task.dueDate} | Category: ${task.category}</span>
    `;
    li.appendChild(taskContentSpan);

    const controlsDiv = document.createElement("div");
    controlsDiv.classList.add("item-controls");

    if (task.completed) {
      li.classList.add("completed-task");
      // Remove ability to re-complete, maybe add undo complete later
    } else {
      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Complete";
      completeBtn.classList.add("action-btn", "complete-btn");
      completeBtn.addEventListener("click", () => completeTask(task.id));
      controlsDiv.appendChild(completeBtn);

      if (task.dueDate && task.dueDate < today) {
        li.classList.add("overdue-task");
      }
    }

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("action-btn", "edit-btn");
    editBtn.addEventListener("click", () => editTask(task.id));
    controlsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("action-btn", "delete-btn");
    deleteBtn.addEventListener("click", () => deleteTask(task.id));
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    taskList.appendChild(li);
  });
  saveTasks(); // Save tasks after rendering (any changes from complete/delete)
  checkBadges(); // Re-check badges if tasks state changes
  updateGamificationUI();
}

function addTaskManual() {
  const text = newTaskText.value.trim();
  const dueDate = newTaskDueDate.value;
  const category = newTaskCategory.value;

  if (text) {
    tasks.push({ id: generateUniqueId(), text, completed: false, dueDate, category });
    newTaskText.value = "";
    newTaskDueDate.value = "";
    newTaskCategory.value = "Personal";
    renderTasks();
  }
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    renderTasks();
  }
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  const li = taskList.querySelector(`li[data-id="${id}"]`);
  if (!task || !li) return;

  li.classList.add('editing'); // Add editing class for styling
  li.innerHTML = ''; // Clear current content

  const inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.value = task.text;
  inputField.classList.add('edit-input');
  li.appendChild(inputField);

  const dueDateInput = document.createElement('input');
  dueDateInput.type = 'date';
  dueDateInput.value = task.dueDate;
  dueDateInput.classList.add('edit-input');
  li.appendChild(dueDateInput);

  const categorySelect = document.createElement('select');
  categorySelect.classList.add('edit-input');
  ['Personal', 'Work', 'Health', 'Finance', 'Other'].forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (task.category === cat) option.selected = true;
      categorySelect.appendChild(option);
  });
  li.appendChild(categorySelect);


  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('action-btn', 'edit-save-btn');
  saveBtn.addEventListener('click', () => {
    task.text = inputField.value.trim();
    task.dueDate = dueDateInput.value;
    task.category = categorySelect.value;
    if (task.text) {
      renderTasks(); // Re-render to update UI and remove editing state
    } else {
        alert("Task description cannot be empty.");
        // Revert to original state if input is empty
        renderTasks();
    }
  });
  li.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('action-btn', 'edit-cancel-btn');
  cancelBtn.addEventListener('click', () => {
    renderTasks(); // Re-render to revert to original state
  });
  li.appendChild(cancelBtn);

  inputField.focus();
}

function deleteTask(id) {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
  }
}

// --- Note Management Functions ---
function renderNotes() {
  notesList.innerHTML = "";
  notes.forEach(note => {
    const li = document.createElement("li");
    li.dataset.id = note.id;

    const noteContentSpan = document.createElement("span");
    noteContentSpan.classList.add("item-content");
    noteContentSpan.innerHTML = `
        ${note.text}
        <span class="task-meta">Category: ${note.category}</span>
    `;
    li.appendChild(noteContentSpan);

    const controlsDiv = document.createElement("div");
    controlsDiv.classList.add("item-controls");

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("action-btn", "edit-btn");
    editBtn.addEventListener("click", () => editNote(note.id));
    controlsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("action-btn", "delete-btn");
    deleteBtn.addEventListener("click", () => deleteNote(note.id));
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    notesList.appendChild(li);
  });
  saveNotes();
}

function addNoteManual() {
  const text = newNoteText.value.trim();
  const category = newNoteCategory.value;
  if (text) {
    notes.push({ id: generateUniqueId(), text, category });
    newNoteText.value = "";
    newNoteCategory.value = "General";
    renderNotes();
  }
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    const li = notesList.querySelector(`li[data-id="${id}"]`);
    if (!note || !li) return;

    li.classList.add('editing');
    li.innerHTML = '';

    const inputField = document.createElement('textarea'); // Use textarea for notes
    inputField.value = note.text;
    inputField.classList.add('edit-textarea');
    li.appendChild(inputField);

    const categorySelect = document.createElement('select');
    categorySelect.classList.add('edit-input');
    ['General', 'Meeting', 'Idea', 'Learning', 'Personal'].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (note.category === cat) option.selected = true;
        categorySelect.appendChild(option);
    });
    li.appendChild(categorySelect);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.classList.add('action-btn', 'edit-save-btn');
    saveBtn.addEventListener('click', () => {
        note.text = inputField.value.trim();
        note.category = categorySelect.value;
        if (note.text) {
            renderNotes();
        } else {
            alert("Note content cannot be empty.");
            renderNotes();
        }
    });
    li.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.classList.add('action-btn', 'edit-cancel-btn');
    cancelBtn.addEventListener('click', () => {
        renderNotes();
    });
    li.appendChild(cancelBtn);

    inputField.focus();
}

function deleteNote(id) {
  if (confirm("Are you sure you want to delete this note?")) {
    notes = notes.filter(n => n.id !== id);
    renderNotes();
  }
}


// --- Budget & Transaction Functions ---
let budgetChartInstance; // To store the Chart.js instance

function addTransactionManual() {
    const amount = parseFloat(transactionAmount.value);
    const description = transactionDescription.value.trim();
    const category = transactionCategory.value;
    const type = transactionType.value;
    const date = new Date().toISOString().split('T')[0]; // Current date

    if (isNaN(amount) || amount <= 0 || !description) {
        alert("Please enter a valid amount and description for the transaction.");
        return;
    }

    transactions.push({ id: generateUniqueId(), amount, description, category, type, date });
    transactionAmount.value = "";
    transactionDescription.value = "";
    transactionCategory.value = "Food";
    transactionType.value = "Expense";
    renderBudget();
    saveTransactions();
}

function deleteTransaction(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        transactions = transactions.filter(t => t.id !== id);
        renderBudget();
        saveTransactions();
    }
}

function setBudgetGoalManual() {
    const newGoal = parseFloat(monthlyBudgetGoalInput.value);
    if (isNaN(newGoal) || newGoal < 0) {
        alert("Please enter a valid budget goal.");
        return;
    }
    budgetGoal = newGoal;
    monthlyBudgetGoalInput.value = "";
    renderBudget();
    saveBudgetGoal();
}

function renderBudget() {
    renderBudgetSummary();
    renderBudgetChart();
    renderRecentTransactions();
}

function renderBudgetSummary() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = transactions.filter(t =>
        t.type === 'Expense' &&
        new Date(t.date).getMonth() === currentMonth &&
        new Date(t.date).getFullYear() === currentYear
    ).reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncome = transactions.filter(t =>
        t.type === 'Income' &&
        new Date(t.date).getMonth() === currentMonth &&
        new Date(t.date).getFullYear() === currentYear
    ).reduce((sum, t) => sum + t.amount, 0);

    const netBalance = monthlyIncome - monthlyExpenses;

    currentBudgetGoalEl.textContent = `Monthly Goal: ${budgetGoal ? `$${budgetGoal.toFixed(2)}` : 'Not Set'}`;

    let summaryText = `This month (Net): <b>$${netBalance.toFixed(2)}</b> (Income: $${monthlyIncome.toFixed(2)}, Expenses: $${monthlyExpenses.toFixed(2)})`;

    if (budgetGoal > 0) {
        if (monthlyExpenses > budgetGoal) {
            summaryText += `<br>You are <b>$${(monthlyExpenses - budgetGoal).toFixed(2)}</b> over your budget goal!`;
            dailyRecommendationText.textContent = "Consider reviewing your expenses, you're over budget!";
        } else {
            summaryText += `<br>You have <b>$${(budgetGoal - monthlyExpenses).toFixed(2)}</b> remaining in your budget.`;
            dailyRecommendationText.textContent = "Keep up the good work on your budget!";
        }
    } else {
        dailyRecommendationText.textContent = "Set a monthly budget goal for better financial tracking.";
    }
    budgetSummaryEl.innerHTML = summaryText;
}


function renderBudgetChart() {
    if (budgetChartInstance) {
        budgetChartInstance.destroy(); // Destroy previous chart instance
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Aggregate expenses by category for current month
    const categoryExpenses = transactions.filter(t =>
        t.type === 'Expense' &&
        new Date(t.date).getMonth() === currentMonth &&
        new Date(t.date).getFullYear() === currentYear
    ).reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});

    const labels = Object.keys(categoryExpenses);
    const data = Object.values(categoryExpenses);

    const monthlyExpensesTotal = data.reduce((sum, val) => sum + val, 0);

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Expenses by Category',
            data: data,
            backgroundColor: [
                'rgba(255, 99, 132, 0.7)', // Red
                'rgba(54, 162, 235, 0.7)', // Blue
                'rgba(255, 206, 86, 0.7)', // Yellow
                'rgba(75, 192, 192, 0.7)', // Green
                'rgba(153, 102, 255, 0.7)', // Purple
                'rgba(255, 159, 64, 0.7)'  // Orange
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    };

    if (budgetGoal > 0) {
        chartData.labels.push('Budget Remaining');
        chartData.datasets[0].data.push(Math.max(0, budgetGoal - monthlyExpensesTotal));
        chartData.datasets[0].backgroundColor.push('rgba(40, 167, 69, 0.7)'); // Green for remaining
        chartData.datasets[0].borderColor.push('rgba(40, 167, 69, 1)');

        if (monthlyExpensesTotal > budgetGoal) {
            chartData.labels.push('Budget Overrun');
            chartData.datasets[0].data.push(monthlyExpensesTotal - budgetGoal);
            chartData.datasets[0].backgroundColor.push('rgba(255, 0, 0, 0.7)'); // Bright Red for overrun
            chartData.datasets[0].borderColor.push('rgba(255, 0, 0, 1)');
        }
    }


    budgetChartInstance = new Chart(budgetChartCtx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: var("--color-text") // Dynamic text color
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderRecentTransactions() {
    recentTransactionsList.innerHTML = "";
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first
    sortedTransactions.slice(0, 5).forEach(t => { // Show only last 5
        const li = document.createElement("li");
        li.classList.add("transaction-item", t.type === 'Expense' ? 'expense' : 'income');
        li.dataset.id = t.id;

        const detailsDiv = document.createElement("div");
        detailsDiv.classList.add("transaction-details");
        detailsDiv.innerHTML = `
            <span>${t.description} (${t.category})</span>
            <span class="amount">${t.type === 'Expense' ? '-' : '+'}$${t.amount.toFixed(2)}</span>
            <span class="date">${t.date}</span>
        `;
        li.appendChild(detailsDiv);

        const controlsDiv = document.createElement("div");
        controlsDiv.classList.add("item-controls");
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("action-btn", "delete-btn");
        deleteBtn.addEventListener("click", () => deleteTransaction(t.id));
        controlsDiv.appendChild(deleteBtn);
        li.appendChild(controlsDiv);

        recentTransactionsList.appendChild(li);
    });

    if (transactions.length === 0) {
        recentTransactionsList.innerHTML = "<li>No recent transactions.</li>";
    }
}


// ========================
// Voice recognition & Jarvis
// ========================

function initSpeechRecognition() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    alert("Sorry, your browser does not support Speech Recognition.");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
    startBtn.disabled = true;
    jarvisReply.textContent = "Listening for your command...";
  };

  recognition.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
    jarvisReply.textContent = "Waiting for your command.";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    jarvisReply.textContent = "Error during speech recognition. Please try again.";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    userSpeech.textContent = transcript;

    // Only listen (no reply) if the command starts with "Jarvis" or "Hey Jarvis"
    if (/^(jarvis|hey jarvis)/i.test(transcript)) {
      // Extract command after "Jarvis" keyword
      const command = transcript.replace(/^(jarvis|hey jarvis)/i, "").trim();
      if (command) {
        handleCommand(command.toLowerCase());
      } else {
        jarvisReply.textContent = "Yes, how can I help you?";
      }
    } else {
      // If not a Jarvis command, clear reply or provide a hint
      jarvisReply.textContent = "Say 'Hey Jarvis' to activate voice commands.";
    }
  };

  return recognition;
}

function handleCommand(command) {
  let response = "";

  if (command.includes("time")) {
    const now = new Date();
    response = `The current time is ${now.toLocaleTimeString()}.`;
  } else if (command.includes("date")) {
    const today = new Date();
    response = `Today's date is ${today.toLocaleDateString()}.`;
  } else if (command.includes("tasks")) {
    const incomplete = tasks.filter(t => !t.completed);
    response = incomplete.length ? `You have ${incomplete.length} tasks pending: ${incomplete.map(t => t.text).join(", ")}` : "You have no pending tasks!";
  } else if (command.includes("complete task")) {
    // Example: "complete task submit budget report"
    const match = command.match(/complete task (.+)/);
    if (match && match[1]) {
      const taskName = match[1].trim();
      const task = tasks.find(t => t.text.toLowerCase().includes(taskName.toLowerCase())); // Use includes for partial match
      if (task && !task.completed) {
        completeTask(task.id);
        response = `Marked "${task.text}" as completed. Good job!`;
      } else if (task && task.completed) {
        response = `"${task.text}" is already completed.`;
      } else {
        response = `Task "${taskName}" not found.`;
      }
    } else {
      response = "Please specify the task name to complete.";
    }
  } else if (command.includes("theme")) {
    // Command example: "theme dark"
    if (command.includes("dark")) {
      setTheme("dark");
      response = "Dark theme activated.";
    } else if (command.includes("light")) {
      setTheme("light");
      response = "Light theme activated.";
    } else if (command.includes("vibrant")) {
      setTheme("vibrant");
      response = "Vibrant theme activated.";
    } else {
      response = "Please specify a valid theme: light, dark, or vibrant.";
    }
  } else if (command.includes("points")) {
    response = `You have ${points} points. Keep going!`;
  } else if (command.includes("streak")) {
    response = `Your current streak is ${streak} day${streak === 1 ? "" : "s"}.`;
  } else if (command.includes("add task")) {
      // Simplified for voice, manual is primary for details
      const match = command.match(/add task (.+)/);
      if (match && match[1]) {
          const text = match[1].trim();
          tasks.push({ id: generateUniqueId(), text, completed: false, dueDate: "No Date", category: "Voice" });
          renderTasks();
          response = `Task "${text}" added.`;
      } else {
          response = "Please specify the task to add.";
      }
  } else if (command.includes("add note")) {
      const match = command.match(/add note (.+)/);
      if (match && match[1]) {
          const text = match[1].trim();
          notes.push({ id: generateUniqueId(), text, category: "Voice" });
          renderNotes();
          response = `Note "${text}" added.`;
      } else {
          response = "Please specify the note content.";
      }
  }
  else {
    response = "Sorry, I didn't understand that command.";
  }

  jarvisReply.textContent = response;
}

// =================
// Theme management
// =================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  // Re-render chart to apply new theme colors
  renderBudgetChart();
}

function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("dark"); // Default to dark on first load
  }
}

// =======================
// Data Export/Import/Clear
// =======================
function exportData() {
    const data = {
        tasks: tasks,
        notes: notes,
        transactions: transactions,
        budgetGoal: budgetGoal,
        streak: streak,
        lastCompletionDate: lastCompletionDate,
        points: points,
        badges: badges
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jarvis_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Data exported successfully!");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (confirm("Importing data will overwrite your current data. Continue?")) {
                tasks = importedData.tasks || [];
                notes = importedData.notes || [];
                transactions = importedData.transactions || [];
                budgetGoal = importedData.budgetGoal || 0;
                streak = importedData.streak || 0;
                lastCompletionDate = importedData.lastCompletionDate || null;
                points = importedData.points || 0;
                badges = importedData.badges || [];

                saveTasks();
                saveNotes();
                saveTransactions();
                saveBudgetGoal();
                saveGamification();
                initializeUI(); // Re-render everything
                alert("Data imported successfully!");
            }
        } catch (error) {
            alert("Failed to import data. Please ensure it's a valid JSON file. Error: " + error.message);
            console.error("Import error:", error);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm("Are you sure you want to clear ALL your Jarvis data? This action cannot be undone.")) {
        localStorage.clear(); // Clears all local storage for this domain
        // Reset in-memory data
        tasks = [];
        notes = [];
        transactions = [];
        budgetGoal = 0;
        streak = 0;
        lastCompletionDate = null;
        points = 0;
        badges = [];
        initializeUI(); // Re-render everything with empty data
        alert("All data cleared successfully!");
    }
}


// =================
// Initialization
// =================
function initializeUI() {
    loadData(); // Load all data first
    renderTasks();
    renderNotes();
    renderBudget(); // Renders summary, chart, and recent transactions
    updateGamificationUI();
    loadTheme(); // Load theme after all elements are present
    // Ensure the monthlyBudgetGoalInput reflects the loaded goal
    monthlyBudgetGoalInput.value = budgetGoal > 0 ? budgetGoal : '';
}


// Event Listeners
startBtn.addEventListener("click", () => {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (!listening) {
    recognition.start();
  } else {
    recognition.stop();
  }
});

themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// Manual Entry Event Listeners
addTaskBtn.addEventListener("click", addTaskManual);
addNoteBtn.addEventListener("click", addNoteManual);
addTransactionBtn.addEventListener("click", addTransactionManual);
setBudgetGoalBtn.addEventListener("click", setBudgetGoalManual);

// Data Management Event Listeners
exportDataBtn.addEventListener("click", exportData);
importDataBtn.addEventListener("click", () => importDataInput.click()); // Trigger file input click
importDataInput.addEventListener("change", importData);
clearAllDataBtn.addEventListener("click", clearAllData);


// On load
initializeUI();