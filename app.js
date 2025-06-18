// ==========================
// Jarvis Voice Assistant App
// ==========================

const startBtn = document.getElementById("startBtn");
const userSpeechEl = document.getElementById("userSpeech"); // Renamed to avoid conflict
const jarvisReplyEl = document.getElementById("jarvisReply"); // Renamed to avoid conflict
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverview = document.getElementById("budgetOverview"); // This might be repurposed or removed
const budgetChart = document.getElementById("budgetChart").getContext("2d");
const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

// Manual Entry Elements
const newTaskTextEl = document.getElementById("newTaskText");
const newTaskDueDateEl = document.getElementById("newTaskDueDate");
const newTaskCategoryEl = document.getElementById("newTaskCategory");
const addTaskBtn = document.getElementById("addTaskBtn");
const newNoteTextEl = document.getElementById("newNoteText");
const newNoteCategoryEl = document.getElementById("newNoteCategory");
const addNoteBtn = document.getElementById("addNoteBtn");
const transactionAmountEl = document.getElementById("transactionAmount");
const transactionDescriptionEl = document.getElementById("transactionDescription");
const transactionTypeEl = document.getElementById("transactionType");
const addTransactionBtn = document.getElementById("addTransactionBtn");
const budgetGoalAmountEl = document.getElementById("budgetGoalAmount");
const setBudgetGoalBtn = document.getElementById("setBudgetGoalBtn");
const currentBudgetGoalEl = document.getElementById("currentBudgetGoal");
const budgetSummaryEl = document.getElementById("budgetSummary"); // New element for summary text

// Data Management Elements
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const dailyRecommendationTextEl = document.getElementById("dailyRecommendationText");


let recognition;
let listening = false;
let currentTheme = 'light';

// --- Data Models (loaded from localStorage) ---
let tasks = [];
let notes = [];
let transactions = [];
let budgetGoal = null;

// --- Gamification state saved in localStorage ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  TRANSACTIONS: "jarvis_transactions",
  BUDGET_GOAL: "jarvis_budget_goal",
};

// --- Load all data from localStorage ---
function loadAllData() {
  streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
  lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
  points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
  badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
  notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [];
  transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  budgetGoal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_GOAL));

  updateGamificationUI();
  renderTasks();
  renderNotes();
  renderBudgetChart();
  updateBudgetSummary();
  updateBudgetGoalUI();
  loadTheme(); // Load theme after body is available
  generateDailyRecommendation(); // Generate after all data is loaded
}

// --- Save all data to localStorage ---
function saveAllData() {
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.BUDGET_GOAL, JSON.stringify(budgetGoal));
}

// Update streak UI
function updateGamificationUI() {
  streakCountEl.textContent = streak;
  pointsCountEl.textContent = points;

  badgesEl.innerHTML = '';
  if (badges.length === 0) {
    badgesEl.textContent = "No badges earned yet!";
  } else {
    badges.forEach(badge => {
      const badgeEl = document.createElement("span");
      badgeEl.classList.add("badge");
      badgeEl.textContent = badge;
      badgesEl.appendChild(badgeEl);
    });
  }
}

// Check if today is next day after last completion to increment streak
function checkAndUpdateStreak() {
  const today = new Date().toDateString();

  if (!lastCompletionDate) {
    // First completion ever or streak reset
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
  saveAllData();
}

// Add points & check badges
function addPoints(value) {
  points += value;
  saveAllData();
  checkBadges();
  updateGamificationUI();
}

// Check badges earned
function checkBadges() {
  // Badge conditions
  if (points >= 50 && !badges.includes("Productivity Pro")) {
    badges.push("Productivity Pro");
  }
  if (streak >= 5 && !badges.includes("5-Day Streak")) {
    badges.push("5-Day Streak");
  }
  if (streak >= 10 && !badges.includes("10-Day Streak")) {
    badges.push("10-Day Streak");
  }
  // Check "All Tasks Done" badge only if there are tasks and all are completed
  if (tasks.length > 0 && tasks.every(t => t.completed) && !badges.includes("All Tasks Done")) {
    badges.push("All Tasks Done");
  }
  saveAllData();
}

// Task Management
function addTask(text, dueDate, category) {
  if (!text) return;
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  tasks.push({ id: newId, text, completed: false, dueDate, category });
  saveAllData();
  renderTasks();
  jarvisReplyEl.textContent = `Task "${text}" added.`;
}

// Mark task completed (simulate)
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    saveAllData();
    renderTasks();
    updateGamificationUI();
    jarvisReplyEl.textContent = `Marked "${task.text}" as completed. Good job!`;
  } else if (task && task.completed) {
    jarvisReplyEl.textContent = `"${task.text}" is already completed.`;
  } else {
    jarvisReplyEl.textContent = `Task not found.`;
  }
}

// Render tasks in UI
function renderTasks() {
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    taskList.textContent = "No tasks yet. Add one above!";
    return;
  }
  tasks.sort((a, b) => {
    // Sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Then by due date (earliest first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });

  tasks.forEach(task => {
    const li = document.createElement("li");
    let taskInfo = task.text;
    if (task.dueDate) {
      const today = new Date().toDateString();
      const dueDate = new Date(task.dueDate);
      const isOverdue = !task.completed && dueDate < new Date(today);
      taskInfo += ` (Due: ${task.dueDate}${isOverdue ? ' - OVERDUE!' : ''})`;
    }
    if (task.category) {
      taskInfo += ` [${task.category}]`;
    }
    li.textContent = taskInfo;
    if (task.completed) {
      li.classList.add("completed-task");
    } else {
      li.style.cursor = "pointer";
      li.title = "Click to mark complete";
      li.addEventListener("click", () => completeTask(task.id));
    }
    taskList.appendChild(li);
  });
}

// Note Taking
function addNote(text, category) {
  if (!text) return;
  notes.push({ text, category, timestamp: new Date().toISOString() });
  saveAllData();
  renderNotes();
  jarvisReplyEl.textContent = `Note "${text}" added.`;
}

// Render notes in UI
function renderNotes() {
  notesList.innerHTML = "";
  if (notes.length === 0) {
    notesList.textContent = "No notes yet. Jot one down!";
    return;
  }
  notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first
  notes.forEach(note => {
    const li = document.createElement("li");
    li.textContent = `${note.text}${note.category ? ` [${note.category}]` : ''}`;
    notesList.appendChild(li);
  });
}

// Budget Tracking
function addTransaction(amount, description, type) {
  if (!amount || isNaN(amount)) return;
  transactions.push({ amount: parseFloat(amount), description, type, timestamp: new Date().toISOString() });
  saveAllData();
  renderBudgetChart();
  updateBudgetSummary();
  jarvisReplyEl.textContent = `${type === 'expense' ? 'Expense' : 'Income'} of $${amount} recorded.`;
}

function setBudgetGoal(amount) {
  if (!amount || isNaN(amount)) return;
  budgetGoal = parseFloat(amount);
  saveAllData();
  updateBudgetGoalUI();
  renderBudgetChart();
  updateBudgetSummary();
  jarvisReplyEl.textContent = `Monthly budget goal set to $${amount}.`;
}

function updateBudgetGoalUI() {
  if (budgetGoal !== null) {
    currentBudgetGoalEl.textContent = `Monthly Goal: $${budgetGoal.toFixed(2)}`;
  } else {
    currentBudgetGoalEl.textContent = "No budget goal set.";
  }
}

function updateBudgetSummary() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && new Date(t.timestamp).getMonth() === currentMonth && new Date(t.timestamp).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && new Date(t.timestamp).getMonth() === currentMonth && new Date(t.timestamp).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.amount, 0);

  let summaryText = "";
  if (budgetGoal !== null) {
    const remainingBudget = budgetGoal - monthlyExpenses;
    const percentageUsed = budgetGoal > 0 ? (monthlyExpenses / budgetGoal * 100).toFixed(1) : 0;
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)} of $${budgetGoal.toFixed(2)} (${percentageUsed}% used). Remaining: $${remainingBudget.toFixed(2)}.`;
    if (monthlyExpenses > budgetGoal) {
      summaryText += " You are over budget!";
    }
  } else {
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)}. Income: $${monthlyIncome.toFixed(2)}.`;
  }
  budgetSummaryEl.textContent = summaryText;
}


// Budget chart (simple bar chart with Canvas API)
function renderBudgetChart() {
  const ctx = budgetChart;
  ctx.clearRect(0, 0, 300, 150); // Clear previous chart

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Get last 6 months of expense data
  const monthlySpending = Array(6).fill(0); // For 6 months
  const monthLabels = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));

    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.timestamp).getMonth() === month && new Date(t.timestamp).getFullYear() === year)
      .reduce((sum, t) => sum + t.amount, 0);
    monthlySpending[5 - i] = monthExpenses;
  }

  const maxSpending = Math.max(...monthlySpending, budgetGoal || 0);
  const chartHeight = 130;
  const barWidth = 30;
  const gap = 20; // Increased gap for better spacing
  const startX = 25; // Adjusted start X to center bars

  ctx.fillStyle = currentTheme === "dark" ? "#69c" : "#0078d7"; // Bar color

  // Render bars
  monthlySpending.forEach((value, i) => {
    const barHeight = maxSpending > 0 ? (value / maxSpending) * chartHeight : 0;
    ctx.fillRect(startX + i * (barWidth + gap), 140 - barHeight, barWidth, barHeight);

    // Draw month label
    ctx.fillStyle = currentTheme === "dark" ? "#eee" : "#222"; // Text color
    ctx.textAlign = "center";
    ctx.font = "10px Arial";
    ctx.fillText(monthLabels[i], startX + i * (barWidth + gap) + barWidth / 2, 140 + 15);
  });

  // Draw budget goal line if set
  if (budgetGoal !== null && maxSpending > 0) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    const goalY = 140 - (budgetGoal / maxSpending) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(15, goalY);
    ctx.lineTo(300, goalY);
    ctx.stroke();
    ctx.fillStyle = "red";
    ctx.fillText(`Goal: $${budgetGoal.toFixed(0)}`, 30, goalY - 5);
  }

  // Axis line
  ctx.strokeStyle = currentTheme === "dark" ? "#aaa" : "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, 140);
  ctx.lineTo(300, 140);
  ctx.stroke();
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
  };

  recognition.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    jarvisReplyEl.textContent = "Speech recognition error. Please try again.";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    userSpeechEl.textContent = transcript;

    // Only listen (no reply) if the command starts with "Jarvis" or "Hey Jarvis"
    if (/^(jarvis|hey jarvis)/i.test(transcript)) {
      // Extract command after "Jarvis" keyword
      const command = transcript.replace(/^(jarvis|hey jarvis)/i, "").trim();
      if (command) {
        handleCommand(command.toLowerCase());
      } else {
        // If no command after "jarvis", don't reply, just listen
        jarvisReplyEl.textContent = "Yes, how can I help?";
      }
    } else {
      // Manual mode or other speech, don't reply
      jarvisReplyEl.textContent = "";
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
      const task = tasks.find(t => t.text.toLowerCase() === taskName.toLowerCase());
      if (task) { // The completeTask function handles completion status
        completeTask(task.id);
      } else {
        response = `Task "${taskName}" not found.`;
      }
    } else {
      response = "Please specify the task name to complete.";
    }
  } else if (command.includes("add task")) {
    const match = command.match(/add task (.+)/);
    if (match && match[1]) {
      const taskText = match[1].trim();
      addTask(taskText, "", ""); // Add with no due date or category initially
      response = `Task "${taskText}" added.`;
    } else {
      response = "Please specify the task to add.";
    }
  } else if (command.includes("add note")) {
    const match = command.match(/add note (.+)/);
    if (match && match[1]) {
      const noteText = match[1].trim();
      addNote(noteText, ""); // Add with no category initially
      response = `Note "${noteText}" added.`;
    } else {
      response = "Please specify the note to add.";
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
  } else if (command.includes("recommendation") || command.includes("daily tip")) {
    response = dailyRecommendationTextEl.textContent; // Read the current recommendation
  }
  else {
    response = "Sorry, I didn't understand that command.";
  }

  jarvisReplyEl.textContent = response;
}

// Daily Recommendation
function generateDailyRecommendation() {
  const incompleteTasks = tasks.filter(t => !t.completed).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const recentNotes = notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  let recommendation = "Stay productive!";

  if (incompleteTasks.length > 0) {
    const urgentTask = incompleteTasks[0];
    if (urgentTask.dueDate && new Date(urgentTask.dueDate) < new Date()) {
      recommendation = `Heads up! Task "${urgentTask.text}" is overdue. Time to get it done!`;
    } else {
      recommendation = `Your most urgent task is: "${urgentTask.text}". Focus on it today!`;
    }
  } else if (notes.length === 0) {
    recommendation = "You have no notes. Jot down some ideas or reminders today!";
  } else if (totalExpenses === 0) {
    recommendation = "No transactions recorded yet this month. Keep track of your spending!";
  } else if (points < 50) {
    recommendation = "Earn more points by completing tasks! Aim for 'Productivity Pro' badge!";
  }

  dailyRecommendationTextEl.textContent = recommendation;
}


// =================
// Theme management
// =================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  renderBudgetChart(); // Re-render chart for theme colors
}

function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("light");
  }
}

// =======================
// Import/Export Functionality
// =======================

function exportAllData() {
  const data = {
    tasks: tasks,
    notes: notes,
    transactions: transactions,
    budgetGoal: budgetGoal,
    streak: streak,
    lastCompletionDate: lastCompletionDate,
    points: points,
    badges: badges,
    theme: currentTheme,
  };
  const dataStr = JSON.stringify(data, null, 2); // Pretty print JSON

  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jarvis_data.json";
  document.body.appendChild(a); // Required for Firefox
  a.click();
  document.body.removeChild(a); // Clean up
  URL.revokeObjectURL(url);
  jarvisReplyEl.textContent = "Data exported successfully!";
}

function importAllData(event) {
  const file = event.target.files[0];
  if (!file) {
    jarvisReplyEl.textContent = "No file selected for import.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);

      // Validate and load data
      if (importedData.tasks && Array.isArray(importedData.tasks)) {
        tasks = importedData.tasks;
      }
      if (importedData.notes && Array.isArray(importedData.notes)) {
        notes = importedData.notes;
      }
      if (importedData.transactions && Array.isArray(importedData.transactions)) {
        transactions = importedData.transactions;
      }
      if (importedData.hasOwnProperty('budgetGoal')) {
        budgetGoal = importedData.budgetGoal;
      }
      if (importedData.hasOwnProperty('streak')) {
        streak = importedData.streak;
      }
      if (importedData.hasOwnProperty('lastCompletionDate')) {
        lastCompletionDate = importedData.lastCompletionDate;
      }
      if (importedData.hasOwnProperty('points')) {
        points = importedData.points;
      }
      if (importedData.badges && Array.isArray(importedData.badges)) {
        badges = importedData.badges;
      }
      if (importedData.theme) {
        setTheme(importedData.theme);
      }

      saveAllData(); // Save the imported data to localStorage
      loadAllData(); // Re-render all UI components with new data
      jarvisReplyEl.textContent = "Data imported successfully!";

    } catch (error) {
      console.error("Error parsing imported JSON:", error);
      jarvisReplyEl.textContent = "Failed to import data. Please check the file format.";
    }
  };
  reader.readAsText(file);
}


// =================
// Event Listeners
// =================

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

addTaskBtn.addEventListener("click", () => {
  const text = newTaskTextEl.value.trim();
  const dueDate = newTaskDueDateEl.value; // YYYY-MM-DD format
  const category = newTaskCategoryEl.value;
  addTask(text, dueDate, category);
  newTaskTextEl.value = "";
  newTaskDueDateEl.value = "";
  newTaskCategoryEl.value = "";
});

addNoteBtn.addEventListener("click", () => {
  const text = newNoteTextEl.value.trim();
  const category = newNoteCategoryEl.value;
  addNote(text, category);
  newNoteTextEl.value = "";
  newNoteCategoryEl.value = "";
});

addTransactionBtn.addEventListener("click", () => {
  const amount = transactionAmountEl.value;
  const description = transactionDescriptionEl.value.trim();
  const type = transactionTypeEl.value;
  addTransaction(amount, description, type);
  transactionAmountEl.value = "";
  transactionDescriptionEl.value = "";
});

setBudgetGoalBtn.addEventListener("click", () => {
  const amount = budgetGoalAmountEl.value;
  setBudgetGoal(amount);
  budgetGoalAmountEl.value = "";
});


exportDataBtn.addEventListener("click", exportAllData);
importDataBtn.addEventListener("click", () => {
  importFileInput.click(); // Trigger the hidden file input
});
importFileInput.addEventListener("change", importAllData);


// =================
// Initialization
// =================

// Load all data and render UI on page load
document.addEventListener("DOMContentLoaded", loadAllData);