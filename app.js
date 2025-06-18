// ===========================================
// Jarvis Personal AI Assistant App Logic
// (Comprehensive Update for Assessment Requirements)
// ===========================================

// --- DOM Element References ---
const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");

// Dashboard List Elements
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const transactionsList = document.getElementById("transactionsList"); // Added for budget entries
const totalTransactionsDisplay = document.getElementById("totalTransactionsDisplay"); // To show overall budget sum
const budgetOverview = document.getElementById("budgetOverview"); // Main text for budget overview
const budgetChartCanvas = document.getElementById("budgetChart"); // Canvas element for Chart.js
const budgetChartContext = budgetChartCanvas ? budgetChartCanvas.getContext("2d") : null;

// Gamification Elements
const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const taskCompletionStats = document.getElementById("taskCompletionStats"); // To display completed task count

// Theme Switcher
const themeSelect = document.getElementById("themeSelect");

// Manual Entry Form Elements (from screenshots)
const newTaskInput = document.getElementById("newTaskInput");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const newTaskPriority = document.getElementById("newTaskPriority");
const newTaskCategory = document.getElementById("newTaskCategory");
const newTaskRecurring = document.getElementById("newTaskRecurring");
const newTaskRecurrencePattern = document.getElementById("newTaskRecurrencePattern");
const addTaskBtn = document.getElementById("addTaskBtn");
const addTaskTemplateBtn = document.getElementById("addTaskTemplateBtn");

const newNoteInput = document.getElementById("newNoteInput");
const newNoteCategory = document.getElementById("newNoteCategory");
const newNoteTags = document.getElementById("newNoteTags");
const addNoteBtn = document.getElementById("addNoteBtn");
const addNoteTemplateBtn = document.getElementById("addNoteTemplateBtn");

const newTransactionAmountInput = document.getElementById("newTransactionAmountInput");
const newTransactionDescInput = document.getElementById("newTransactionDescInput");
const newTransactionType = document.getElementById("newTransactionType");
const newTransactionCategory = document.getElementById("newTransactionCategory");
const addTransactionBtn = document.getElementById("addTransactionBtn");

const monthlyBudgetGoalInput = document.getElementById("monthlyBudgetGoalInput");
const setBudgetGoalBtn = document.getElementById("setBudgetGoalBtn");


// Dashboard - Dynamic Content & Search/Filter
const dailyRecommendationText = document.getElementById("dailyRecommendationText");
const smartTaskSuggestionText = document.getElementById("smartTaskSuggestionText"); // For smart suggestions
const productivityHeatmap = document.getElementById("productivityHeatmap"); // Heatmap container

const taskSearchInput = document.getElementById("taskSearchInput");
const taskSortSelect = document.getElementById("taskSortSelect");
const noteSearchInput = document.getElementById("noteSearchInput");
const relatedNotesList = document.getElementById("relatedNotesList");

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
let myBudgetChartInstance; // Stores the Chart.js instance for the budget line chart

// --- Data Models (loaded from localStorage for persistence) ---
let tasks = []; // Array of task objects: {id, text, completed, dueDate, priority, category, isRecurring, recurrencePattern}
let notes = []; // Array of note objects: {id, content, category, tags[]}
let transactions = []; // Array of transaction objects: {id, type ('expense'/'received'), amount, description, category, date}
let monthlyBudgetGoal = 0; // User-defined monthly budget goal

// --- Gamification State ---
let streak = 0;
let lastCompletionDate = null; // ISO string 'YYYY-MM-DD'
let points = 0;
let badges = []; // Array of earned badge names
let dailyCompletions = {}; // Object: { 'YYYY-MM-DD': count, ... } for heatmap

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date", // Last date a task was completed
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  TRANSACTIONS: "jarvis_transactions",
  MONTHLY_BUDGET_GOAL: "jarvis_monthly_budget_goal",
  DAILY_COMPLETIONS: "jarvis_daily_completions", // For heatmap
  LAST_DAILY_CHECK: "jarvis_last_daily_check", // To ensure daily logic runs once a day
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
  transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  monthlyBudgetGoal = parseFloat(localStorage.getItem(STORAGE_KEYS.MONTHLY_BUDGET_GOAL)) || 0;
  
  streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0', 10);
  lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
  points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS) || '0', 10);
  badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
  dailyCompletions = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_COMPLETIONS) || '{}');

  // Load theme first, as it affects rendering colors
  loadTheme();

  // Handle daily recurring tasks and recommendations (run once per day)
  handleDailyCheck();

  // Initial rendering of UI components based on loaded data
  renderTasks(); // Includes filtering/sorting
  renderNotes(); // Includes search/related notes
  renderTransactions(); // Populates list before chart
  renderBudgetChart(); // Depends on transactions data
  updateBudgetOverview(); // Depends on transactions & goal
  updateGamificationUI();
  generateDailyRecommendation();
  generateSmartTaskSuggestion();
  renderHeatmap(); // Render productivity heatmap
  updateBudgetGoalUI(); // Show the loaded budget goal
}

/**
 * Saves all current application data to localStorage.
 * (Individual save functions are also called after specific updates for efficiency)
 */
function saveAllDataToLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.MONTHLY_BUDGET_GOAL, monthlyBudgetGoal);

  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
  localStorage.setItem(STORAGE_KEYS.DAILY_COMPLETIONS, JSON.stringify(dailyCompletions));
  localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
}

/**
 * Helper for generating unique IDs (simple timestamp + random string).
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Ensures daily checks (like recurring tasks, streak reset) happen only once per day.
 */
function handleDailyCheck() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastCheck = localStorage.getItem(STORAGE_KEYS.LAST_DAILY_CHECK);

    if (lastCheck !== today) {
        // This is the first check for today
        processRecurringTasks();
        checkStreak(); // Update streak based on previous day's activity
        localStorage.setItem(STORAGE_KEYS.LAST_DAILY_CHECK, today);
    }
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
  if (taskCompletionStats) taskCompletionStats.textContent = `Total Completed Tasks: ${tasks.filter(t => t.completed).length}`;

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
function checkAndUpdateStreakForCompletion() {
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
 * Checks the streak when the app loads (part of handleDailyCheck).
 * Resets streak if no task completed yesterday.
 */
function checkStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const lastRecordedCompletion = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);

    if (!lastRecordedCompletion) {
        streak = 0; // No tasks ever completed, no streak
    } else {
        const lastDateObj = new Date(lastRecordedCompletion);
        const todayDateObj = new Date(today);
        const diffTime = todayDateObj.getTime() - lastDateObj.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Calculate difference in days

        if (diffDays === 1) {
            // Streak continues, already incremented by checkAndUpdateStreakForCompletion
            // No action needed here, it's about checking if it *should* continue
        } else if (diffDays > 1) {
            streak = 0; // Streak broken
        }
    }
    localStorage.setItem(STORAGE_KEYS.STREAK, streak);
    updateGamificationUI();
}


/**
 * Adds points to the user's total and triggers badge checks.
 * @param {number} value - The number of points to add.
 */
function awardPoints(value) {
  points += value;
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
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
    { name: "Financial Tracker", condition: () => transactions.length >= 10 },
    { name: "Budget Buddy", condition: () => monthlyBudgetGoal > 0 && transactions.filter(t => t.type === 'expense' && t.date.startsWith(new Date().toISOString().slice(0,7))).reduce((sum, t) => sum + t.amount, 0) <= monthlyBudgetGoal }
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
 * Also handles search and sort.
 */
function renderTasks() {
  if (!taskList) return; // Ensure taskList element exists

  const searchTerm = taskSearchInput.value.toLowerCase();
  const sortBy = taskSortSelect.value;

  let filteredTasks = tasks.filter(task => 
      task.text.toLowerCase().includes(searchTerm) || 
      (task.category && task.category.toLowerCase().includes(searchTerm))
  );

  filteredTasks.sort((a, b) => {
    // Incomplete tasks first for all sorts
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('2999-12-31');
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('2999-12-31');
      return dateA - dateB;
    } else if (sortBy === 'priority') {
      const priorities = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorities[b.priority] - priorities[a.priority]; // High to Low
    } else if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    } else if (sortBy === 'completed') {
        // Already handled by initial completed/incomplete sort
        return 0; 
    }
    return 0;
  });

  taskList.innerHTML = ''; // Clear current list

  if (filteredTasks.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No tasks found. Add one or adjust filters!";
    taskList.appendChild(li);
    return;
  }

  filteredTasks.forEach(task => {
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
    if (task.priority) taskTextContent += ` [${task.priority.toUpperCase()}]`;
    if (task.category) taskTextContent += ` (#${task.category})`;
    if (task.isRecurring) taskTextContent += ` (Recurring: ${task.recurrencePattern})`;
    
    const taskTextSpan = document.createElement('span');
    taskTextSpan.textContent = taskTextContent;
    taskTextSpan.classList.add('task-text-content'); 

    if (task.completed) {
      li.classList.add('completed-task');
    }

    li.appendChild(taskTextSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('item-controls');

    const completeBtn = document.createElement('button');
    completeBtn.innerHTML = task.completed ? '&#8634;' : '&#10003;'; // Undo or Checkmark
    completeBtn.classList.add('action-btn', 'complete-btn');
    completeBtn.title = task.completed ? 'Mark as incomplete' : 'Mark as complete';
    completeBtn.onclick = () => toggleTaskComplete(task.id);
    controlsDiv.appendChild(completeBtn);

    const editBtn = document.createElement('button');
    editBtn.innerHTML = '&#9998;'; // Pencil icon
    editBtn.classList.add('action-btn', 'edit-btn');
    editBtn.title = 'Edit task';
    editBtn.onclick = () => showEditTaskPrompt(task.id);
    controlsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;'; // 'x' icon
    deleteBtn.classList.add('action-btn', 'delete-btn');
    deleteBtn.title = 'Delete task';
    deleteBtn.onclick = () => deleteTask(task.id);
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    taskList.appendChild(li);
  });
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  updateGamificationUI(); // Update stats related to task completion
}

/**
 * Adds a new task to the list.
 * @param {string} text - The description of the task.
 * @param {string} dueDate - The due date of the task (YYYY-MM-DD).
 * @param {string} priority - Priority of the task ('low', 'medium', 'high').
 * @param {string} category - Category of the task.
 * @param {boolean} isRecurring - Whether the task is recurring.
 * @param {string} recurrencePattern - 'daily', 'weekly', 'monthly' if recurring.
 */
function addTask(text, dueDate, priority = 'medium', category = 'General', isRecurring = false, recurrencePattern = '') {
  if (text.trim() === "") {
    speakJarvisReply("Please provide a description for the task.");
    return;
  }
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  tasks.push({ id: newId, text: text.trim(), completed: false, dueDate: dueDate, priority, category: category.trim(), isRecurring, recurrencePattern });
  saveTasks();
  renderTasks();
  speakJarvisReply(`Task "${text}" added.`);
  awardPoints(5); // Award points for adding a task
  generateSmartTaskSuggestion(); // Re-evaluate smart suggestions
}

/**
 * Toggles a task's completed status.
 * @param {number} id - The ID of the task to toggle.
 */
function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    if (task.completed) {
        awardPoints(10); // Award points for completion
        checkAndUpdateStreakForCompletion(); // Update streak logic for completion
        speakJarvisReply(`Task "${task.text}" marked as completed. Good job!`);
    } else {
        speakJarvisReply(`Task "${task.text}" marked incomplete.`);
    }
    saveTasks();
    renderTasks(); // Re-render to reflect changes
  } else {
    speakJarvisReply(`Task not found.`);
  }
}

/**
 * Prompts user for task edit details and calls editTask.
 * @param {number} id - The ID of the task to edit.
 */
function showEditTaskPrompt(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        speakJarvisReply("Task not found for editing.");
        return;
    }

    const newText = prompt('Edit task description:', task.text);
    if (newText === null || newText.trim() === '') { // User cancelled or empty
        speakJarvisReply("Task edit cancelled or description was empty.");
        return;
    }
    const newDueDate = prompt('Edit due date (YYYY-MM-DD):', task.dueDate);
    const newPriority = prompt(`Edit priority (low, medium, high):`, task.priority);
    const newCategory = prompt(`Edit category:`, task.category);
    const newIsRecurring = confirm(`Is this task recurring? (Currently: ${task.isRecurring ? 'Yes' : 'No'})`);
    let newRecurrencePattern = task.recurrencePattern;
    if (newIsRecurring) {
        newRecurrencePattern = prompt(`Recurrence pattern (daily, weekly, monthly):`, task.recurrencePattern || 'daily');
    }

    editTask(task.id, newText, newDueDate, newPriority, newCategory, newIsRecurring, newRecurrencePattern);
}

/**
 * Edits an existing task.
 * @param {number} id - The ID of the task to edit.
 * @param {string} newText - The new description.
 * @param {string} newDueDate - The new due date.
 * @param {string} newPriority - The new priority.
 * @param {string} newCategory - The new category.
 * @param {boolean} newIsRecurring - The new recurring status.
 * @param {string} newRecurrencePattern - The new recurrence pattern.
 */
function editTask(id, newText, newDueDate, newPriority, newCategory, newIsRecurring, newRecurrencePattern) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex > -1) {
    tasks[taskIndex].text = newText.trim();
    tasks[taskIndex].dueDate = newDueDate || '';
    tasks[taskIndex].priority = newPriority ? newPriority.toLowerCase() : 'medium';
    tasks[taskIndex].category = newCategory ? newCategory.trim() : 'General';
    tasks[taskIndex].isRecurring = newIsRecurring;
    tasks[taskIndex].recurrencePattern = newRecurrencePattern || '';
    saveTasks();
    renderTasks();
    speakJarvisReply(`Task "${newText}" updated.`);
    generateSmartTaskSuggestion(); // Re-evaluate smart suggestions
  } else {
    speakJarvisReply("Task not found for update.");
  }
}

/**
 * Deletes a task from the list.
 * @param {number} id - The ID of the task to delete.
 */
function deleteTask(id) {
  const confirmation = prompt("Type 'DELETE' to confirm deletion of this task:", "");
  if (confirmation && confirmation.toUpperCase() === 'DELETE') {
    const originalLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    if (tasks.length < originalLength) {
      saveTasks();
      renderTasks();
      speakJarvisReply("Task deleted.");
      generateSmartTaskSuggestion(); // Re-evaluate smart suggestions
    } else {
      speakJarvisReply("Failed to delete task.");
    }
  } else {
    speakJarvisReply("Task deletion cancelled.");
  }
}

/**
 * Processes recurring tasks on daily check.
 * If a recurring task's due date has passed and it's marked complete, or it's simply passed,
 * a new instance is created for the next cycle.
 */
function processRecurringTasks() {
    const today = new Date().toISOString().slice(0, 10);
    let tasksAddedCount = 0;

    tasks.filter(task => task.isRecurring).forEach(task => {
        if (!task.dueDate) return; // Recurring task must have a due date

        const taskDueDate = new Date(task.dueDate);
        const todayDate = new Date(today); // Use same date object type for comparison

        // If the task's due date is today or in the past
        if (taskDueDate <= todayDate) {
            // Calculate next due date
            let nextDueDate = new Date(taskDueDate);
            if (task.recurrencePattern === 'daily') {
                nextDueDate.setDate(nextDueDate.getDate() + 1);
            } else if (task.recurrencePattern === 'weekly') {
                nextDueDate.setDate(nextDueDate.getDate() + 7);
            } else if (task.recurrencePattern === 'monthly') {
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            } else {
                // Unknown pattern, skip
                return;
            }

            // Create a new task instance for the next period, if it's still in the future or today
            // And ensure we don't duplicate if already processed for this cycle
            // Simple check: if there's no existing identical task with the future due date
            const newDueDateISO = nextDueDate.toISOString().slice(0, 10);
            const existsNextInstance = tasks.some(t => 
                t.text === task.text && 
                t.category === task.category && 
                t.isRecurring && 
                t.recurrencePattern === task.recurrencePattern &&
                t.dueDate === newDueDateISO
            );

            if (!existsNextInstance) {
                const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
                tasks.push({
                    id: newId,
                    text: task.text,
                    completed: false,
                    dueDate: newDueDateISO,
                    priority: task.priority,
                    category: task.category,
                    isRecurring: true,
                    recurrencePattern: task.recurrencePattern
                });
                tasksAddedCount++;
            }
        }
    });

    if (tasksAddedCount > 0) {
        saveTasks();
        renderTasks();
        speakJarvisReply(`Generated ${tasksAddedCount} new recurring task instances.`);
    }
}


const taskTemplates = [
    { text: "Weekly Report Submission", priority: "high", category: "Work", isRecurring: true, recurrencePattern: "weekly" },
    { text: "Call Mom", priority: "medium", category: "Personal", isRecurring: true, recurrencePattern: "weekly" },
    { text: "Review Monthly Budget", priority: "high", category: "Finance", isRecurring: true, recurrencePattern: "monthly" },
    { text: "Exercise for 30 minutes", priority: "low", category: "Health", isRecurring: true, recurrencePattern: "daily" },
    { text: "Check Emails", priority: "medium", category: "Work", isRecurring: false, recurrencePattern: "" }
];

/**
 * Adds a task from a predefined template.
 */
function addTaskFromTemplate() {
    let templateOptions = taskTemplates.map((t, i) => `${i + 1}. ${t.text} (P: ${t.priority}, C: ${t.category})`).join('\n');
    let choice = prompt(`Choose a task template:\n${templateOptions}\nEnter number:`);
    choice = parseInt(choice, 10);

    if (!isNaN(choice) && choice > 0 && choice <= taskTemplates.length) {
        const template = taskTemplates[choice - 1];
        const newDueDate = new Date().toISOString().slice(0, 10); // Default template to today
        addTask(template.text, newDueDate, template.priority, template.category, template.isRecurring, template.recurrencePattern);
        speakJarvisReply(`Task "${template.text}" added from template.`);
    } else {
        speakJarvisReply("Invalid template choice or cancelled.");
    }
}


// =========================
// Note-Taking Functions
// =========================

function loadNotes() {
    const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
    }
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

/**
 * Renders the notes list in the UI, including delete controls.
 * Also handles search and related notes.
 */
function renderNotes() {
  if (!notesList) return;
  
  const searchTerm = noteSearchInput.value.toLowerCase();
  let filteredNotes = notes.filter(note => 
      note.content.toLowerCase().includes(searchTerm) || 
      (note.category && note.category.toLowerCase().includes(searchTerm)) || 
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
  );

  notesList.innerHTML = '';
  if (filteredNotes.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No notes found. Jot one down or adjust search!";
    notesList.appendChild(li);
    return;
  }
  filteredNotes.forEach((note, index) => {
    const li = document.createElement('li');
    let noteDisplay = note.content;
    if (note.category) noteDisplay += ` (#${note.category})`;
    if (note.tags && note.tags.length > 0) noteDisplay += ` [${note.tags.join(', ')}]`;

    li.innerHTML = `
      <span>${noteDisplay}</span>
      <button class="action-btn delete-btn" onclick="deleteNote(${note.id})">&times;</button>
    `;
    notesList.appendChild(li);
  });
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes)); // Save after render
  generateRelatedNotes(); // Update related notes whenever notes change
}

/**
 * Adds a new note to the list.
 * @param {string} content - The content of the note.
 * @param {string} category - The category of the note.
 * @param {string[]} tags - An array of tags for the note.
 */
function addNote(content, category = 'General', tags = []) {
  if (content.trim() === "") {
    speakJarvisReply("Please provide content for the note.");
    return;
  }
  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, content: content.trim(), category: category.trim(), tags });
  saveNotes();
  renderNotes();
  speakJarvisReply(`Note "${content.substring(0, 30)}..." added.`);
}

/**
 * Deletes a note from the list.
 * @param {number} id - The ID of the note to delete.
 */
function deleteNote(id) {
  const confirmation = prompt("Type 'DELETE' to confirm deletion of this note:", "");
  if (confirmation && confirmation.toUpperCase() === 'DELETE') {
    const originalLength = notes.length;
    notes = notes.filter(n => n.id !== id);
    if (notes.length < originalLength) {
      saveNotes();
      renderNotes();
      speakJarvisReply("Note deleted.");
    } else {
      speakJarvisReply("Failed to delete note.");
    }
  } else {
    speakJarvisReply("Note deletion cancelled.");
  }
}

const noteTemplates = [
    { content: "Meeting notes:\n- Agenda:\n- Attendees:\n- Decisions:\n- Action Items:", category: "Meeting", tags: ["template", "meeting"] },
    { content: "Idea for project X:\n- Core concept:\n- Features:\n- Potential challenges:", category: "Idea", tags: ["template", "project"] },
    { content: "Daily reflection:\n- What went well today:\n- What could be improved:\n- Tomorrow's focus:", category: "Reflection", tags: ["template", "daily"] }
];

/**
 * Adds a note from a predefined template.
 */
function addNoteFromTemplate() {
    let templateOptions = noteTemplates.map((t, i) => `${i + 1}. ${t.content.split('\n')[0]} (C: ${t.category})`).join('\n');
    let choice = prompt(`Choose a note template:\n${templateOptions}\nEnter number:`);
    choice = parseInt(choice, 10);

    if (!isNaN(choice) && choice > 0 && choice <= noteTemplates.length) {
        const template = noteTemplates[choice - 1];
        addNote(template.content, template.category, template.tags);
        speakJarvisReply(`Note added from template: "${template.content.split('\n')[0]}..."`);
    } else {
        speakJarvisReply("Invalid template choice or cancelled.");
    }
}

/**
 * Generates and displays notes related to the current note search term.
 */
function generateRelatedNotes() {
    if (!relatedNotesList) return;
    relatedNotesList.innerHTML = '';
    const searchTerm = noteSearchInput.value.toLowerCase();

    if (searchTerm.length < 3) { // Require at least 3 chars for meaningful search
        relatedNotesList.textContent = 'Type in search box to find related notes.';
        return;
    }

    const related = notes.filter(note => 
        note.content.toLowerCase().includes(searchTerm) ||
        (note.category && note.category.toLowerCase().includes(searchTerm)) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );

    if (related.length > 0) {
        related.slice(0, 5).forEach(note => { // Show up to 5 related notes
            const li = document.createElement('li');
            li.textContent = note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '');
            relatedNotesList.appendChild(li);
        });
    } else {
        relatedNotesList.textContent = 'No related notes found.';
    }
}


// =========================
// Budget Tracking Functions
// =========================

function loadTransactions() {
    const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

/**
 * Renders the transactions list and updates the total expenses/income display.
 */
function renderTransactions() {
    if (!transactionsList || !totalTransactionsDisplay) return;
    transactionsList.innerHTML = '';
    
    const currentMonthTransactions = transactions.filter(t => t.date.startsWith(new Date().toISOString().slice(0, 7)));

    let totalExpenses = 0;
    let totalReceived = 0;

    if (currentMonthTransactions.length === 0) {
        const li = document.createElement('li');
        li.textContent = "No transactions recorded this month.";
        transactionsList.appendChild(li);
        totalTransactionsDisplay.textContent = `Current Month: Expenses $0.00 | Income $0.00`;
        return;
    }

    // Sort transactions by da