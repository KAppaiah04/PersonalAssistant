// ===========================================
// Jarvis Personal AI Assistant App Logic
// (Comprehensive Update for Assessment Requirements)
// ===========================================

// --- DOM Element References ---
const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const expensesList = document.getElementById("expensesList");
const totalExpensesDisplay = document.getElementById("totalExpensesDisplay");
const budgetOverview = document.getElementById("budgetOverview"); // Main text for budget overview
const budgetChartCanvas = document.getElementById("budgetChart");
const budgetChartContext = budgetChartCanvas ? budgetChartCanvas.getContext("2d") : null;

const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

// Manual Entry Form Elements
const newTaskInput = document.getElementById("newTaskInput");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const addTaskBtn = document.getElementById("addTaskBtn");

const newNoteInput = document.getElementById("newNoteInput");
const addNoteBtn = document.getElementById("addNoteBtn");

const newExpenseAmountInput = document.getElementById("newExpenseAmountInput");
const newExpenseDescInput = document.getElementById("newExpenseDescInput");
const addExpenseBtn = document.getElementById("addExpenseBtn");

const dailyRecommendationText = document.getElementById("dailyRecommendationText");
const productivityHeatmap = document.getElementById("productivityHeatmap"); // New heatmap container

// Data Management & Share Elements
const exportAllDataBtn = document.getElementById("exportAllDataBtn");
const importAllDataFile = document.getElementById("importAllDataFile");
const importAllDataBtn = document.getElementById("importAllDataBtn");
const shareSummaryBtn = document.getElementById("shareSummaryBtn");
const clearAllDataBtn = document.getElementById("clearAllDataBtn");


// --- Global Application State Variables ---
let recognition; // Web Speech API SpeechRecognition object
let listening = false; // State for voice assistant listening
let currentTheme = 'dark'; // Default theme for immersive UI (as per CSS)
let myBudgetChartInstance; // Stores the Chart.js instance for the budget pie chart

// --- Data Models (loaded from localStorage for persistence) ---
let tasks = []; // Array of task objects: {id, text, completed, dueDate}
let notes = []; // Array of note strings
let expenses = []; // Array of expense objects: {id, amount, description, date}

// --- Gamification State ---
let streak = 0;
let lastCompletionDate = null; // ISO string 'YYYY-MM-DD'
let points = 0;
let badges = []; // Array of earned badge names
let dailyCompletions = {}; // Object: { 'YYYY-MM-DD': count, ... } for heatmap

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  EXPENSES: "jarvis_expenses",
  DAILY_COMPLETIONS: "jarvis_daily_completions", // New for heatmap
};

// =======================================
// Core Data Loading & Saving (Persistence)
// =======================================

/**
 * Loads all application data from localStorage.
 */
function loadAllData() {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
  notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [];
  expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES)) || [];
  
  streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0', 10);
  lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
  points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS) || '0', 10);
  badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
  dailyCompletions = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_COMPLETIONS) || '{}');

  // Load theme last, as it may trigger rendering functions that need data
  loadTheme();

  // Initial rendering of UI components based on loaded data
  renderTasks();
  renderNotes();
  renderExpenses(); // This function also updates budget chart
  updateGamificationUI();
  generateDailyRecommendation();
  renderHeatmap(); // Render productivity heatmap
}

/**
 * Saves all current application data to localStorage.
 * (Individual save functions are still used after specific updates)
 */
function saveAllDataToLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
  localStorage.setItem(STORAGE_KEYS.DAILY_COMPLETIONS, JSON.stringify(dailyCompletions));
  localStorage.setItem(STORAGE_KEYS.THEME, currentTheme); // Ensure theme is also saved
}

// Helper for generating unique IDs
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// =========================
// Gamification Logic
// =========================

/**
 * Updates the gamification display (streak, points, badges).
 */
function updateGamificationUI() {
  if (streakCountEl) streakCountEl.textContent = streak;
  if (pointsCountEl) pointsCountEl.textContent = points;

  if (badgesEl) {
    badgesEl.innerHTML = '';
    if (badges.length === 0) {
      badgesEl.textContent = "No badges earned yet. Keep going!";
    } else {
      badges.forEach(badge => {
        const badgeEl = document.createElement("span");
        badgeEl.classList.add("badge");
        badgeEl.textContent = badge;
        badgesEl.appendChild(badgeEl);
      });
    }
  }
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

/**
 * Checks and updates the daily streak based on task completion.
 */
function checkAndUpdateStreak() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

  // Increment daily completion count for heatmap
  dailyCompletions[today] = (dailyCompletions[today] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.DAILY_COMPLETIONS, JSON.stringify(dailyCompletions));
  renderHeatmap(); // Update heatmap immediately

  if (lastCompletionDate === today) {
    // Already completed a task today, streak doesn't increase, just points/heatmap
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (lastCompletionDate === yesterdayISO) {
    streak += 1;
    speakJarvisReply(`Streak! You're on a ${streak}-day streak!`);
  } else {
    streak = 1; // Streak broken or new streak started
    speakJarvisReply(`New streak started!`);
  }
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, today);
  checkBadges();
}

/**
 * Adds points to the user's total and triggers badge checks.
 * @param {number} value - The number of points to add.
 */
function addPoints(value) {
  points += value;
  updateGamificationUI();
  checkBadges();
}

/**
 * Checks if new badges have been earned based on current stats and awards them.
 */
function checkBadges() {
  const allBadges = [
    { name: "Novice Achiever", condition: () => points >= 100 },
    { name: "Productivity Pro", condition: () => points >= 500 },
    { name: "7-Day Master", condition: () => streak >= 7 },
    { name: "Task Conqueror", condition: () => tasks.filter(t => t.completed).length >= 20 },
    { name: "Financial Tracker", condition: () => expenses.length >= 10 }
  ];

  allBadges.forEach(b => {
    if (b.condition() && !badges.includes(b.name)) {
      badges.push(b.name);
      speakJarvisReply(`Congratulations! You earned the "${b.name}" badge!`);
    }
  });
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

// =========================
// Task Management Functions
// =========================

/**
 * Renders the task list in the UI, including completion, edit, and delete controls.
 */
function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = ''; // Clear current list

  // Sort tasks: incomplete first, then by earliest due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1; // Completed go to end
    if (!a.completed && b.completed) return -1; // Incomplete come first

    // Then sort by due date (empty dates last)
    const dateA = a.dueDate ? new Date(a.dueDate) : new Date('2999-12-31'); // Push tasks with no due date to end
    const dateB = b.dueDate ? new Date(b.dueDate) : new Date('2999-12-31');
    return dateA - dateB;
  });

  if (sortedTasks.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No tasks yet. Add one above!";
    taskList.appendChild(li);
    return;
  }

  sortedTasks.forEach(task => {
    const li = document.createElement('li');
    li.dataset.id = task.id; // Use data-id for easier element selection

    let taskTextContent = task.text;
    if (task.dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (!task.completed && task.dueDate < today) {
        li.classList.add('overdue-task');
        taskTextContent += ` (OVERDUE: ${task.dueDate})`;
      } else {
        taskTextContent += ` (Due: ${task.dueDate})`;
      }
    }
    
    // Create a span for the text content
    const taskTextSpan = document.createElement('span');
    taskTextSpan.textContent = taskTextContent;
    taskTextSpan.classList.add('task-text-content'); // Class for styling text part

    // Add completion class
    if (task.completed) {
      li.classList.add('completed-task');
    }

    li.appendChild(taskTextSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('item-controls');

    if (!task.completed) {
      const completeBtn = document.createElement('button');
      completeBtn.innerHTML = '&#10003;'; // Checkmark icon
      completeBtn.classList.add('action-btn', 'complete-btn');
      completeBtn.title = 'Mark as complete';
      completeBtn.onclick = () => completeTask(task.id);
      controlsDiv.appendChild(completeBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;'; // 'x' icon
    deleteBtn.classList.add('action-btn', 'delete-btn');
    deleteBtn.title = 'Delete task';
    deleteBtn.onclick = () => deleteTask(task.id);
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    taskList.appendChild(li);
  });
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); // Save after render
}

/**
 * Adds a new task to the list.
 * @param {string} text - The description of the task.
 * @param {string} dueDate - The due date of the task (YYYY-MM-DD).
 */
function addTask(text, dueDate) {
  if (text.trim() === "") {
    speakJarvisReply("Please provide a description for the task.");
    return;
  }
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  tasks.push({ id: newId, text: text.trim(), completed: false, dueDate: dueDate });
  renderTasks(); // Re-render to show new task
  speakJarvisReply(`Task "${text}" added.`);
  addPoints(5); // Award points
  updateGamificationUI();
}

/**
 * Marks a task as completed.
 * @param {number} id - The ID of the task to complete.
 */
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10); // Award points for completion
    checkAndUpdateStreak(); // Update streak logic
    renderTasks(); // Re-render
    speakJarvisReply(`Task "${task.text}" completed. Good job!`);
  } else if (task && task.completed) {
    speakJarvisReply(`"${task.text}" is already completed.`);
  } else {
    speakJarvisReply(`Task not found.`);
  }
}

/**
 * Deletes a task from the list.
 * @param {number} id - The ID of the task to delete.
 */
function deleteTask(id) {
  // Use a simple prompt for confirmation (cannot use confirm() in Canvas environment safely)
  const confirmation = prompt("Type 'DELETE' to confirm deletion of this task:", "");
  if (confirmation && confirmation.toUpperCase() === 'DELETE') {
    const originalLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    if (tasks.length < originalLength) {
      renderTasks();
      speakJarvisReply("Task deleted.");
    } else {
      speakJarvisReply("Failed to delete task.");
    }
  } else {
    speakJarvisReply("Task deletion cancelled.");
  }
}


// =========================
// Note-Taking Functions
// =========================

/**
 * Renders the notes list in the UI, including delete controls.
 */
function renderNotes() {
  if (!notesList) return;
  notesList.innerHTML = '';
  if (notes.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No notes yet. Jot one down!";
    notesList.appendChild(li);
    return;
  }
  notes.forEach((note, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${note}</span>
      <button class="delete-btn" onclick="deleteNote(${index})">x</button>
    `;
    notesList.appendChild(li);
  });
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

/**
 * Adds a new note to the list.
 * @param {string} text - The content of the note.
 */
function addNote(text) {
  if (text.trim() === "") {
    speakJarvisReply("Please provide content for the note.");
    return;
  }
  notes.push(text.trim());
  renderNotes();
  speakJarvisReply(`Note "${text.substring(0, 30)}..." added.`);
}

/**
 * Deletes a note from the list.
 * @param {number} index - The index of the note to delete.
 */
function deleteNote(index) {
  const confirmation = prompt("Type 'DELETE' to confirm deletion of this note:", "");
  if (confirmation && confirmation.toUpperCase() === 'DELETE') {
    if (index > -1 && index < notes.length) {
      notes.splice(index, 1);
      renderNotes();
      speakJarvisReply("Note deleted.");
    } else {
      speakJarvisReply("Failed to delete note.");
    }
  } else {
    speakJarvisReply("Note deletion cancelled.");
  }
}

// =========================
// Expense Tracking Functions
// =========================

/**
 * Renders the expenses list and updates the total expenses display.
 */
function renderExpenses() {
  if (!expensesList || !totalExpensesDisplay) return;
  expensesList.innerHTML = '';
  let total = 0;

  if (expenses.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No expenses recorded.";
    expensesList.appendChild(li);
    totalExpensesDisplay.textContent = `Total Expenses: $0.00`;
    updateBudgetChartWithExpenses(0); // Update chart with 0 total
    return;
  }

  // Sort expenses by date, newest first
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  sortedExpenses.forEach(expense => {
    const li = document.createElement('li');
    li.dataset.id = expense.id; // For potential future editing/deleting

    li.innerHTML = `
      <span>$${expense.amount.toFixed(2)} - ${expense.description} (${expense.date})</span>
      <button class="delete-btn" onclick="deleteExpense(${expense.id})">x</button>
    `;
    expensesList.appendChild(li);
    total += expense.amount;
  });
  totalExpensesDisplay.textContent = `Total Expenses: $${total.toFixed(2)}`;
  updateBudgetChartWithExpenses(total); // Update chart based on total expenses
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

/**
 * Adds a new expense entry.
 * @param {string} amount - The amount of the expense.
 * @param {string} description - Description of the expense.
 */
function addExpense(amount, description) {
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    speakJarvisReply("Please enter a valid positive amount for the expense.");
    return;
  }
  if (description.trim() === "") {
    speakJarvisReply("Please enter a description for the expense.");
    return;
  }
  const newId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  expenses.push({ id: newId, amount: parsedAmount, description: description.trim(), date: today });
  renderExpenses(); // Re-render to update list and chart
  speakJarvisReply(`Expense of $${parsedAmount.toFixed(2)} for "${description}" added.`);
  addPoints(3); // Award points for tracking expenses
  updateGamificationUI();
}

/**
 * Deletes an expense entry.
 * @param {number} id - The ID of the expense to delete.
 */
function deleteExpense(id) {
  const confirmation = prompt("Type 'DELETE' to confirm deletion of this expense:", "");
  if (confirmation && confirmation.toUpperCase() === 'DELETE') {
    const originalLength = expenses.length;
    expenses = expenses.filter(e => e.id !== id);
    if (expenses.length < originalLength) {
      renderExpenses();
      speakJarvisReply("Expense deleted.");
    } else {
      speakJarvisReply("Failed to delete expense.");
    }
  } else {
    speakJarvisReply("Expense deletion cancelled.");
  }
}

// =========================
// Budget Overview & Chart (Chart.js)
// =========================

/**
 * Updates the budget pie chart and overview text based on current expenses.
 * @param {number} totalCurrentExpenses - The sum of all recorded expenses.
 */
function updateBudgetChartWithExpenses(totalCurrentExpenses) {
  if (!budgetChartContext) return;

  const hypotheticalBudget = 1500; // This can be made configurable in the future
  const remainingBudget = Math.max(0, hypotheticalBudget - totalCurrentExpenses);

  const dataForChart = [totalCurrentExpenses, remainingBudget];
  const labelsForChart = ['Spent', 'Remaining'];
  const backgroundColors = [
    totalCurrentExpenses > hypotheticalBudget ? 'var(--accent-color)' : 'var(--primary-color)', // Red if over budget, primary color otherwise
    'var(--secondary-color)' // Secondary color for remaining
  ];

  // Get current theme colors for chart labels/tooltips
  const rootStyles = getComputedStyle(document.documentElement);
  const chartTextColor = rootStyles.getPropertyValue('--color-text').trim();

  if (myBudgetChartInstance) {
    myBudgetChartInstance.data.datasets[0].data = dataForChart;
    myBudgetChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    myBudgetChartInstance.data.labels = labelsForChart;
    myBudgetChartInstance.options.plugins.legend.labels.color = chartTextColor;
    myBudgetChartInstance.update();
  } else {
    myBudgetChartInstance = new Chart(budgetChartContext, {
      type: 'pie',
      data: {
        labels: labelsForChart,
        datasets: [{
          label: 'Budget Overview',
          data: dataForChart,
          backgroundColor: backgroundColors,
          borderColor: 'var(--card-bg)', // Match card background for border
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: chartTextColor, // Dynamic color
              font: {
                size: 14
              }
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
            },
            bodyFont: { size: 14 },
            titleFont: { size: 16 }
          }
        }
      }
    });
  }

  let overviewText = `You have spent $${totalCurrentExpenses.toFixed(2)} out of a $${hypotheticalBudget.toFixed(2)} budget this month.`;
  if (totalCurrentExpenses > hypotheticalBudget) {
    overviewText += ` You are $${(totalCurrentExpenses - hypotheticalBudget).toFixed(2)} OVER budget!`;
  } else {
    overviewText += ` You have $${remainingBudget.toFixed(2)} remaining.`;
  }
  budgetOverview.textContent = overviewText;
}

// =========================
// Productivity Heatmap (NEW FEATURE)
// =========================

/**
 * Renders the productivity heatmap based on daily task completions.
 * Displays a grid for the last 60 days.
 */
function renderHeatmap() {
    if (!productivityHeatmap) return;

    productivityHeatmap.innerHTML = ''; // Clear existing heatmap

    const today = new Date();
    const daysToShow = 60; // Show last 60 days

    for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const isoDate = d.toISOString().slice(0, 10); // YYYY-MM-DD

        const completions = dailyCompletions[isoDate] || 0;
        const cell = document.createElement('div');
        cell.classList.add('heatmap-cell');
        cell.dataset.date = isoDate;
        cell.dataset.count = completions;

        // Apply dynamic color based on completion count (0-5, or more)
        if (completions === 0) {
            cell.style.backgroundColor = 'var(--card-bg)'; // Base color, or very light
        } else if (completions === 1) {
            cell.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)';
        } else if (completions === 2) {
            cell.style.backgroundColor = 'rgba(var(--primary-rgb), 0.4)';
        } else if (completions === 3) {
            cell.style.backgroundColor = 'rgba(var(--primary-rgb), 0.6)';
        } else if (completions === 4) {
            cell.style.backgroundColor = 'rgba(var(--primary-rgb), 0.8)';
        } else { // 5 or more
            cell.style.backgroundColor = 'var(--primary-color)';
        }
        
        productivityHeatmap.appendChild(cell);
    }
}


// =========================
// Daily Recommendation
// =========================

const dailyRecommendations = [
    "Start your day by reviewing your top 3 most important tasks.",
    "Take a 15-minute break every 2 hours to recharge your focus.",
    "Prioritize tasks by urgency and importance.",
    "Review your recent expenses and consider your spending habits.",
    "Write down three things you are grateful for today.",
    "Clear your workspace for better productivity.",
    "Spend 30 minutes learning something new related to your goals.",
    "Plan your meals for the week to save time and money.",
    "Engage in light physical activity for at least 20 minutes.",
    "Reach out to one person you haven't spoken to in a while."
];

function generateDailyRecommendation() {
    if (!dailyRecommendationText) return;
    const today = new Date().toDateString();
    let lastRecommendationDate = localStorage.getItem("jarvis_last_recommendation_date");
    let lastRecommendationIndex = parseInt(localStorage.getItem("jarvis_last_recommendation_index") || '0', 10);

    if (lastRecommendationDate !== today) {
        lastRecommendationIndex = (lastRecommendationIndex + 1) % dailyRecommendations.length;
        localStorage.setItem("jarvis_last_recommendation_date", today);
        localStorage.setItem("jarvis_last_recommendation_index", lastRecommendationIndex);
    }
    dailyRecommendationText.textContent = dailyRecommendations[lastRecommendationIndex];
}

// =========================
// Data Export/Import/Share
// =========================

/**
 * Exports all application data as a single JSON file.
 */
function exportAllData() {
    const allData = {
        tasks: tasks,
        notes: notes,
        expenses: expenses,
        gamification: {
            streak: streak,
            lastCompletionDate: lastCompletionDate,
            points: points,
            badges: badges,
            dailyCompletions: dailyCompletions
        },
        theme: currentTheme,
        timestamp: new Date().toISOString() // Add timestamp of export
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `jarvis_data_export_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    speakJarvisReply("All your data has been exported as JSON!");
}

/**
 * Imports all application data from a JSON file.
 * Includes basic validation and overwrite confirmation.
 */
function importAllData(event) {
    const file = event.target.files[0];
    if (!file) {
        speakJarvisReply("No file selected for import.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData || typeof importedData !== 'object' || 
                !Array.isArray(importedData.tasks) || !Array.isArray(importedData.notes) || 
                !Array.isArray(importedData.expenses) || !importedData.gamification) {
                
                speakJarvisReply("Invalid JSON file format. Please select a valid Jarvis data export.");
                console.error("Import failed: Invalid data structure.", importedData);
                return;
            }

            const confirmImport = prompt("Importing data will OVERWRITE your current data. Type 'CONFIRM' to proceed:", "");
            if (confirmImport && confirmImport.toUpperCase() === 'CONFIRM') {
                tasks = importedData.tasks || [];
                notes = importedData.notes || [];
                expenses = importedData.expenses || [];
                
                // Safely import gamification data
                streak = importedData.gamification.streak || 0;
                lastCompletionDate = importedData.gamification.lastCompletionDate || null;
                points = importedData.gamification.points || 0;
                badges = importedData.gamification.badges || [];
                dailyCompletions = importedData.gamification.dailyCompletions || {};

                currentTheme = importedData.theme || 'dark'; // Apply imported theme

                saveAllDataToLocalStorage(); // Save the newly imported data
                loadAllData(); // Re-render UI with new data
                speakJarvisReply("Data imported successfully!");
            } else {
                speakJarvisReply("Data import cancelled.");
            }

        } catch (error) {
            speakJarvisReply(`Failed to import data. Please ensure it's a valid JSON file. Error: ${error.message}`);
            console.error("Import error:", error);
        }
    };

    reader.onerror = () => {
        speakJarvisReply("Failed to read file.");
    };

    reader.readAsText(file);
}

/**
 * Generates and displays a shareable summary report.
 */
function generateSummaryReport() {
    let summary = "Jarvis Personal Assistant Summary Report:\n\n";

    // Tasks Summary
    const incompleteTasks = tasks.filter(t => !t.completed);
    summary += `Tasks (${incompleteTasks.length} pending):\n`;
    if (incompleteTasks.length > 0) {
        incompleteTasks.slice(0, 5).forEach(task => { // Show top 5 incomplete
            summary += `- ${task.text} (Due: ${task.dueDate || 'N/A'})\n`;
        });
        if (incompleteTasks.length > 5) summary += `  ...and ${incompleteTasks.length - 5} more.\n`;
    } else {
        summary += "  No pending tasks! Great job!\n";
    }

    // Notes Summary
    summary += `\nRecent Notes (${notes.length} total):\n`;
    if (notes.length > 0) {
        notes.slice(0, 3).forEach(note => { // Show top 3 recent notes
            summary += `- ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}\n`;
        });
        if (notes.length > 3) summary += `  ...and ${notes.length - 3} more.\n`;
    } else {
        summary += "  No notes recorded.\n";
    }

    // Expenses Summary
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    summary += `\nFinancial Overview:\n`;
    summary += `  Total Expenses Recorded: $${totalExpenses.toFixed(2)}\n`;
    if (expenses.length > 0) {
        const lastExpense = expenses[expenses.length - 1]; // Latest expense
        summary += `  Last Expense: ${lastExpense.description} for $${lastExpense.amount.toFixed(2)} on ${lastExpense.date}\n`;
    } else {
        summary += "  No expenses recorded yet.\n";
    }

    // Gamification Summary
    summary += `\nProductivity Stats:\n`;
    summary += `  Current Streak: ${streak} days\n`;
    summary += `  Total Points: ${points}\n`;
    summary += `  Badges Earned: ${badges.length > 0 ? badges.join(', ') : 'None'}\n`;

    alert("Your Summary Report:\n\n" + summary + "\n\n(This can be copied to your clipboard)");
    // Optionally, try to copy to clipboard (modern method, might require user interaction for security)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary)
            .then(() => speakJarvisReply("Summary generated and copied to clipboard!"))
            .catch(err => {
                console.error('Could not copy text: ', err);
                speakJarvisReply("Summary generated. Copy it manually from the pop-up.");
            });
    } else {
        speakJarvisReply("Summary generated. Copy it manually from the pop-up.");
    }
}


/**
 * Clears all data from localStorage and resets app state.
 */
function clearAllData() {
    const confirmation = prompt("Are you absolutely sure you want to clear ALL your Jarvis data? Type 'CLEAR ALL' to confirm:", "");
    if (confirmation && confirmation.toUpperCase() === 'CLEAR ALL') {
        localStorage.clear(); // Clears all local storage for this domain
        // Reset in-memory data
        tasks = [];
        notes = [];
        expenses = [];
        streak = 0;
        lastCompletionDate = null;
        points = 0;
        badges = [];
        dailyCompletions = {};
        
        loadAllData(); // Re-render everything with empty data
        speakJarvisReply("All data cleared successfully! Starting fresh.");
    } else {
        speakJarvisReply("Data clearing cancelled.");
    }
}


// =========================
// Speech Recognition (Web Speech API)
// =========================

/**
 * Makes Jarvis speak the given text and displays it in the reply area.
 * @param {string} text - The text for Jarvis to speak.
 */
function speakJarvisReply(text) {
  jarvisReply.textContent = text; // Always show text in the UI
  if ('speechSynthesis' in window) {
    // Stop any current speech to prevent overlap
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Set language for better voice
    // You can get voices and set a specific one here if desired
    // Example: const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google US English'));
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech Synthesis API not supported in this browser.");
  }
}

/**
 * Initializes the Web Speech API recognition.
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    speakJarvisReply("Speech recognition not supported in this browser. Please use Chrome or Edge.");
    startBtn.disabled = true;
    return null;
  }

  const recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = false; // Listen for a single utterance
  recognitionInstance.lang = 'en-US';
  recognitionInstance.interimResults = false;
  recognitionInstance.maxAlternatives = 1;

  recognitionInstance.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
    startBtn.style.backgroundColor = "var(--primary-color)"; // Highlight when listening
    userSpeech.textContent = "Speak now...";
    speakJarvisReply("Listening..."); // Short confirmation
  };

  recognitionInstance.onresult = (event) => {
    const speechResult = event.results[0][0].transcript;
    userSpeech.textContent = `You said: "${speechResult}"`;
    handleCommand(speechResult.toLowerCase());
  };

  recognitionInstance.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--accent-color)"; // Revert button color
    userSpeech.textContent = "Say \"Hey Jarvis\" followed by a command...";
  };

  recognitionInstance.onerror = (event) => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--accent-color)";
    speakJarvisReply(`Speech recognition error: ${event.error}. Please try again.`);
    console.error("Speech recognition error:", event.error);
  };

  return recognitionInstance;
}

/**
 * Handles incoming voice commands from the user.
 * @param {string} command - The voice command in lowercase.
 */
function handleCommand(command) {
  let response = "I didn't quite catch that. Can you repeat?";

  // Only respond if command starts with "jarvis" or "hey jarvis"
  if (command.includes("hey jarvis") || command.includes("hi jarvis") || command.includes("jarvis")) {
    const coreCommand = command.replace(/^(hey )?jarvis\s*/, '').trim(); // Remove "hey jarvis" prefix

    if (coreCommand.includes("what can you do")) {
      response = "I can help you manage tasks, take notes, track expenses, visualize your budget, and track your productivity with points and streaks.";
    } else if (coreCommand.includes("list my tasks")) {
      const incomplete = tasks.filter(t => !t.completed);
      response = incomplete.length ? `You have ${incomplete.length} tasks pending: ${incomplete.map(t => t.text).join(", ")}.` : "You have no pending tasks. Great job!";
    } else if (coreCommand.includes("complete task")) {
      const taskText = coreCommand.replace("complete task", "").trim();
      const taskToComplete = tasks.find(t => t.text.toLowerCase().includes(taskText) && !t.completed);
      if (taskToComplete) {
        completeTask(taskToComplete.id); // This already triggers speech
        return;
      } else {
        response = `Task "${taskText}" not found or already completed.`;
      }
    } else if (coreCommand.includes("list my notes")) {
      if (notes.length > 0) {
        response = "Your notes are: " + notes.join("; ") + ".";
      } else {
        response = "You have no notes.";
      }
    } else if (coreCommand.includes("check my expenses") || coreCommand.includes("what are my expenses")) {
        if (expenses.length > 0) {
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            response = `You have recorded expenses totaling $${total.toFixed(2)}. Your recent expenses include: ${expenses.slice(-3).map(e => `${e.description} for $${e.amount.toFixed(2)}`).join(", ")}.`;
        } else {
            response = "You have no recorded expenses.";
        }
    } else if (coreCommand.includes("add task")) {
      const taskMatch = coreCommand.match(/add task (.+?)(?: due (.+))?$/);
      if (taskMatch && taskMatch[1]) {
        const taskText = taskMatch[1].trim();
        const dueDate = taskMatch[2] ? taskMatch[2].trim() : '';
        addTask(taskText, dueDate); // This triggers speech
        return;
      } else {
        response = "Please specify the task to add, for example: 'add task buy groceries'.";
      }
    } else if (coreCommand.includes("add note")) {
      const noteMatch = coreCommand.match(/add note (.+)/);
      if (noteMatch && noteMatch[1]) {
        const noteText = noteMatch[1].trim();
        addNote(noteText); // This triggers speech
        return;
      } else {
        response = "Please specify the note to add, for example: 'add note remember to call mom'.";
      }
    } else if (coreCommand.includes("add expense")) {
        const expenseMatch = coreCommand.match(/add expense (\d+\.?\d*)\s+for\s+(.+)/);
        if (expenseMatch && expenseMatch[1] && expenseMatch[2]) {
            const amount = parseFloat(expenseMatch[1]);
            const description = expenseMatch[2].trim();
            addExpense(amount, description); // This triggers speech
            return;
        } else {
            response = "Please specify the expense amount and description, for example: 'add expense 30 for lunch'.";
        }
    } else if (coreCommand.includes("how am i doing")) {
      response = `You have ${points} points and a ${streak}-day streak. Keep up the good work!`;
    } else if (coreCommand.includes("change theme to")) {
        const themeName = coreCommand.replace("change theme to", "").trim();
        if (["light", "dark", "vibrant"].includes(themeName)) {
            setTheme(themeName); // This triggers chart update and save
            response = `Theme set to ${themeName}.`;
        } else {
            response = "Please choose 'light', 'dark', or 'vibrant'.";
        }
    } else if (coreCommand.includes("export my data")) {
        exportAllData(); // This triggers speech
        return;
    } else if (coreCommand.includes("share summary")) {
        generateSummaryReport(); // This triggers speech
        return;
    } else if (coreCommand.includes("clear all data")) {
        // Will prompt with confirmation, handle through that UI
        response = "To clear all data, please use the 'Clear All Data' button in the Data Management section for confirmation.";
    }
    else {
      response = "Hello. How can I assist you?";
    }
  } else {
    // If command doesn't start with "jarvis", assume general speech and don't reply as Jarvis.
    // userSpeech.textContent already shows what they said.
    return; // Don't speak a generic response.
  }

  speakJarvisReply(response);
}

// =========================
// Theme Management
// =========================

/**
 * Sets the visual theme of the application and saves it.
 * @param {string} theme - The theme name ('light', 'dark', 'vibrant').
 */
function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  // Re-render chart and expenses display to update colors/values
  renderExpenses(); // This will also trigger chart update with new theme colors
}

/**
 * Loads the saved theme preference or defaults to 'dark'.
 */
function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("dark"); // Default theme
  }
}

// =========================
// Initialization & Event Listeners
// =========================

// Main Jarvis Activation Button
startBtn.addEventListener("click", () => {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (recognition) {
    if (!listening) {
      recognition.start();
    } else {
      recognition.stop();
    }
  }
});

// Theme Selector
themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// Manual Entry Form Buttons
if (addTaskBtn) {
  addTaskBtn.addEventListener("click", () => {
    addTask(newTaskInput.value, newTaskDueDate.value);
    newTaskInput.value = ""; // Clear form
    newTaskDueDate.value = "";
  });
}
if (addNoteBtn) {
  addNoteBtn.addEventListener("click", () => {
    addNote(newNoteInput.value);
    newNoteInput.value = ""; // Clear form
  });
}
if (addExpenseBtn) {
  addExpenseBtn.addEventListener("click", () => {
    addExpense(newExpenseAmountInput.value, newExpenseDescInput.value);
    newExpenseAmountInput.value = ""; // Clear form
    newExpenseDescInput.value = "";
  });
}

// Data Management & Share Buttons
if (exportAllDataBtn) {
    exportAllDataBtn.addEventListener("click", exportAllData);
}
if (importAllDataBtn) {
    importAllDataBtn.addEventListener("click", () => {
        importAllDataFile.click(); // Trigger the hidden file input click
    });
}
if (importAllDataFile) {
    importAllDataFile.addEventListener("change", importAllData);
}
if (shareSummaryBtn) {
    shareSummaryBtn.addEventListener("click", generateSummaryReport);
}
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener("click", clearAllData);
}


// On page load, initialize the UI with stored data
document.addEventListener("DOMContentLoaded", loadAllData);