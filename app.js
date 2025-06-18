// ===========================================
// Jarvis Personal AI Assistant App Logic
// (Updated with Edit/Delete & Voice Feedback)
// ===========================================

// --- DOM Element References ---
const startBtn = document.getElementById("startBtn");
const userSpeechEl = document.getElementById("userSpeech");
const jarvisReplyEl = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetChartCanvas = document.getElementById("budgetChart");
const budgetChartCtx = budgetChartCanvas.getContext("2d");
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
const budgetSummaryEl = document.getElementById("budgetSummary");
const dailyRecommendationTextEl = document.getElementById("dailyRecommendationText");

// Data Management Elements
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");


let recognition; // Web Speech API SpeechRecognition object
let listening = false; // State for voice assistant listening
let currentTheme = 'dark'; // Default theme for immersive UI

// --- Data Models (loaded from localStorage for persistence) ---
let tasks = [];
let notes = [];
let transactions = []; // Stores both income and expense with details
let budgetGoal = null; // Stores the monthly budget target

// --- Gamification State ---
let streak = 0;
let lastCompletionDate = null;
let points = 0;
let badges = [];

// --- Local Storage Keys ---
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

// --- Core Data Loading & Saving ---

/**
 * Loads all application data from localStorage.
 */
function loadAllData() {
  streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
  lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
  points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
  badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [];
  notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [];
  transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
  budgetGoal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_GOAL));

  // Render all UI components based on loaded data
  updateGamificationUI();
  renderTasks();
  renderNotes();
  renderBudgetChart();
  updateBudgetSummary();
  updateBudgetGoalUI();
  loadTheme(); // Ensures theme is applied before chart rendering
  generateDailyRecommendation();
}

/**
 * Saves all current application data to localStorage.
 */
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

// --- Gamification Logic ---

/**
 * Updates the gamification display (streak, points, badges).
 */
function updateGamificationUI() {
  streakCountEl.textContent = streak;
  pointsCountEl.textContent = points;

  badgesEl.innerHTML = '';
  if (badges.length === 0) {
    badgesEl.textContent = "No badges earned yet. Keep completing tasks!";
  } else {
    badges.forEach(badge => {
      const badgeEl = document.createElement("span");
      badgeEl.classList.add("badge");
      badgeEl.textContent = badge;
      badgesEl.appendChild(badgeEl);
    });
  }
}

/**
 * Checks and updates the daily streak based on task completion.
 */
function checkAndUpdateStreak() {
  const today = new Date().toDateString(); // e.g., "Wed Jun 18 2025"

  if (!lastCompletionDate) {
    streak = 1; // First completion ever
  } else {
    const lastDate = new Date(lastCompletionDate);
    const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++; // Consecutive day
    } else if (diffDays > 1) {
      streak = 1; // Streak broken, reset
    }
    // If diffDays is 0 (same day), do nothing to streak
  }
  lastCompletionDate = today;
  saveAllData();
}

/**
 * Adds points to the user's total and triggers badge checks.
 * @param {number} value - The number of points to add.
 */
function addPoints(value) {
  points += value;
  saveAllData();
  checkBadges();
  updateGamificationUI();
}

/**
 * Checks if new badges have been earned based on current stats and awards them.
 */
function checkBadges() {
  // Define badges and their conditions
  const allBadges = [
    { name: "Productivity Pro", condition: () => points >= 50 },
    { name: "5-Day Streak", condition: () => streak >= 5 },
    { name: "10-Day Streak", condition: () => streak >= 10 },
    { name: "Task Master", condition: () => tasks.filter(t => t.completed).length >= 10 },
    { name: "Budget Buddy", condition: () => transactions.length >= 5 && budgetGoal !== null && (budgetGoal - transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) >= 0) } // At least 5 transactions and on/under budget
  ];

  allBadges.forEach(b => {
    if (b.condition() && !badges.includes(b.name)) {
      badges.push(b.name);
      speakJarvisReply(`Congratulations! You earned the "${b.name}" badge!`); // Jarvis announces badge
    }
  });
  saveAllData();
}

// --- Task Management Functions ---

/**
 * Adds a new task to the list.
 * @param {string} text - The description of the task.
 * @param {string} dueDate - The due date of the task (YYYY-MM-DD).
 * @param {string} category - The category of the task.
 */
function addTask(text, dueDate, category) {
  if (!text) {
    speakJarvisReply("Please provide a task description.");
    return;
  }
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  tasks.push({ id: newId, text, completed: false, dueDate, category });
  saveAllData();
  renderTasks();
  speakJarvisReply(`Task "${text}" added.`);
}

/**
 * Marks a task as completed.
 * @param {number} id - The ID of the task to complete.
 */
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    saveAllData();
    renderTasks();
    updateGamificationUI();
    speakJarvisReply(`Marked "${task.text}" as completed. Good job!`);
  } else if (task && task.completed) {
    speakJarvisReply(`"${task.text}" is already completed.`);
  } else {
    speakJarvisReply(`Task not found.`);
  }
}

/**
 * Initiates the editing mode for a specific task.
 * @param {number} id - The ID of the task to edit.
 */
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const li = taskList.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  li.innerHTML = ''; // Clear current content

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.value = task.text;
  inputEl.classList.add('edit-input');

  const dateInputEl = document.createElement('input');
  dateInputEl.type = 'date';
  dateInputEl.value = task.dueDate;
  dateInputEl.classList.add('edit-input');

  const categorySelectEl = document.createElement('select');
  categorySelectEl.classList.add('edit-input');
  const categories = ["Work", "Personal", "Home", "Health", "Shopping", "Learning"];
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === task.category) option.selected = true;
    categorySelectEl.appendChild(option);
  });
  if (!task.category) { // Add a default "Select Category" option if none
      const defaultOption = document.createElement('option');
      defaultOption.value = "";
      defaultOption.textContent = "Select Category";
      categorySelectEl.prepend(defaultOption);
      defaultOption.selected = true;
  }

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('edit-save-btn');
  saveBtn.onclick = () => {
    task.text = inputEl.value.trim();
    task.dueDate = dateInputEl.value;
    task.category = categorySelectEl.value;
    saveAllData();
    renderTasks();
    speakJarvisReply(`Task "${task.text}" updated.`);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('edit-cancel-btn');
  cancelBtn.onclick = () => {
    renderTasks(); // Re-render to revert
    speakJarvisReply("Task edit cancelled.");
  };

  li.appendChild(inputEl);
  li.appendChild(dateInputEl);
  li.appendChild(categorySelectEl);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  inputEl.focus(); // Focus on the input field
}

/**
 * Deletes a task from the list.
 * @param {number} id - The ID of the task to delete.
 */
function deleteTask(id) {
  const originalLength = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  if (tasks.length < originalLength) {
    saveAllData();
    renderTasks();
    speakJarvisReply("Task deleted.");
  } else {
    speakJarvisReply("Failed to delete task.");
  }
}

/**
 * Renders the task list in the UI, including edit/delete controls.
 */
function renderTasks() {
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    taskList.textContent = "No tasks yet. Add one using the form above or voice command!";
    return;
  }
  // Sort: incomplete first, then by earliest due date
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.dataset.id = task.id; // Store ID for easy lookup
    let taskInfo = task.text;
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0,0,0,0);

      const isOverdue = !task.completed && dueDate < today;
      const isToday = !task.completed && dueDate.toDateString() === today.toDateString();

      taskInfo += ` (Due: ${task.dueDate}`;
      if (isOverdue) {
        taskInfo += ' - OVERDUE!';
        li.classList.add("overdue-task");
      } else if (isToday) {
        taskInfo += ' - TODAY!';
      }
      taskInfo += ')';
    }
    if (task.category) {
      taskInfo += ` [${task.category}]`;
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = taskInfo;
    li.appendChild(textSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('item-controls');

    if (task.completed) {
      li.classList.add("completed-task");
      const statusSpan = document.createElement('span');
      statusSpan.textContent = ' (Done)';
      statusSpan.classList.add('status-done');
      controlsDiv.appendChild(statusSpan);
    } else {
      li.classList.add("incomplete-task");
      // Mark as complete button/icon
      const completeBtn = document.createElement('button');
      completeBtn.classList.add('action-btn', 'complete-btn');
      completeBtn.title = 'Mark as complete';
      completeBtn.innerHTML = '&#10003;'; // Checkmark icon
      completeBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent li click
        completeTask(task.id);
      };
      controlsDiv.appendChild(completeBtn);

      // Edit button/icon
      const editBtn = document.createElement('button');
      editBtn.classList.add('action-btn', 'edit-btn');
      editBtn.title = 'Edit';
      editBtn.innerHTML = '&#9998;'; // Pencil icon
      editBtn.onclick = (e) => {
        e.stopPropagation();
        editTask(task.id);
      };
      controlsDiv.appendChild(editBtn);
    }

    // Delete button/icon (always present)
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('action-btn', 'delete-btn');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '&#128465;'; // Trash can icon
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    };
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    taskList.appendChild(li);
  });
}


// --- Note Taking Functions ---

/**
 * Adds a new note to the list.
 * @param {string} text - The content of the note.
 * @param {string} category - The category of the note.
 */
function addNote(text, category) {
  if (!text) {
    speakJarvisReply("Please provide a note.");
    return;
  }
  const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text, category, timestamp: new Date().toISOString() });
  saveAllData();
  renderNotes();
  speakJarvisReply(`Note "${text}" added.`);
}

/**
 * Initiates the editing mode for a specific note.
 * @param {number} id - The ID of the note to edit.
 */
function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const li = notesList.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  li.innerHTML = '';

  const textareaEl = document.createElement('textarea');
  textareaEl.value = note.text;
  textareaEl.classList.add('edit-textarea');
  textareaEl.rows = 3;

  const categorySelectEl = document.createElement('select');
  categorySelectEl.classList.add('edit-input');
  const categories = ["Meeting", "Idea", "Reminder", "Learning", "Journal", "General"];
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === note.category) option.selected = true;
    categorySelectEl.appendChild(option);
  });
  if (!note.category) {
      const defaultOption = document.createElement('option');
      defaultOption.value = "";
      defaultOption.textContent = "Select Category";
      categorySelectEl.prepend(defaultOption);
      defaultOption.selected = true;
  }

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('edit-save-btn');
  saveBtn.onclick = () => {
    note.text = textareaEl.value.trim();
    note.category = categorySelectEl.value;
    saveAllData();
    renderNotes();
    speakJarvisReply(`Note "${note.text.substring(0,20)}..." updated.`);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('edit-cancel-btn');
  cancelBtn.onclick = () => {
    renderNotes();
    speakJarvisReply("Note edit cancelled.");
  };

  li.appendChild(textareaEl);
  li.appendChild(categorySelectEl);
  li.appendChild(saveBtn);
  li.appendChild(cancelBtn);
  textareaEl.focus();
}

/**
 * Deletes a note from the list.
 * @param {number} id - The ID of the note to delete.
 */
function deleteNote(id) {
  const originalLength = notes.length;
  notes = notes.filter(n => n.id !== id);
  if (notes.length < originalLength) {
    saveAllData();
    renderNotes();
    speakJarvisReply("Note deleted.");
  } else {
    speakJarvisReply("Failed to delete note.");
  }
}

/**
 * Renders the notes list in the UI, including edit/delete controls.
 */
function renderNotes() {
  notesList.innerHTML = "";
  if (notes.length === 0) {
    notesList.textContent = "No notes yet. Jot one down!";
    return;
  }
  notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first
  notes.forEach(note => {
    const li = document.createElement("li");
    li.dataset.id = note.id; // Store ID for easy lookup

    const textSpan = document.createElement('span');
    textSpan.textContent = `${note.text}${note.category ? ` [${note.category}]` : ''}`;
    li.appendChild(textSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('item-controls');

    // Edit button/icon
    const editBtn = document.createElement('button');
    editBtn.classList.add('action-btn', 'edit-btn');
    editBtn.title = 'Edit';
    editBtn.innerHTML = '&#9998;';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      editNote(note.id);
    };
    controlsDiv.appendChild(editBtn);

    // Delete button/icon
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('action-btn', 'delete-btn');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '&#128465;';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteNote(note.id);
    };
    controlsDiv.appendChild(deleteBtn);

    li.appendChild(controlsDiv);
    notesList.appendChild(li);
  });
}

// --- Budget Tracking Functions ---

/**
 * Adds a new transaction (income or expense) to the list.
 * @param {number} amount - The amount of the transaction.
 * @param {string} description - A brief description.
 * @param {string} type - 'income' or 'expense'.
 */
function addTransaction(amount, description, type) {
  if (!amount || isNaN(amount) || amount <= 0) {
    speakJarvisReply("Please enter a valid positive amount for the transaction.");
    return;
  }
  if (!description) {
    speakJarvisReply("Please add a description for the transaction.");
    return;
  }
  const newId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
  transactions.push({ id: newId, amount: parseFloat(amount), description, type, timestamp: new Date().toISOString() });
  saveAllData();
  renderBudgetChart();
  updateBudgetSummary();
  checkBadges();
  speakJarvisReply(`${type === 'expense' ? 'Expense' : 'Income'} of $${amount} for ${description} recorded.`);
}

/**
 * Initiates the editing mode for a specific transaction.
 * Note: Transaction editing can be complex. This is a basic implementation.
 * @param {number} id - The ID of the transaction to edit.
 */
function editTransaction(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  });

  const li = document.createElement('li'); // Create a temporary li for editing, then replace
  li.classList.add('editing-transaction');

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.value = transaction.amount;
  amountInput.classList.add('edit-input');

  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.value = transaction.description;
  descInput.classList.add('edit-input');

  const typeSelect = document.createElement('select');
  typeSelect.classList.add('edit-input');
  ['expense', 'income'].forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === transaction.type) option.selected = true;
    typeSelect.appendChild(option);
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.classList.add('edit-save-btn');
  saveBtn.onclick = () => {
    transaction.amount = parseFloat(amountInput.value);
    transaction.description = descInput.value.trim();
    transaction.type = typeSelect.value;
    saveAllData();
    renderBudgetChart(); // Re-render chart and summary
    updateBudgetSummary();
    speakJarvisReply(`Transaction updated to $${transaction.amount} (${transaction.type}).`);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.classList.add('edit-cancel-btn');
  cancelBtn.onclick = () => {
    renderBudgetChart(); // Re-render to clear edit mode
    updateBudgetSummary(); // Re-render summary
    speakJarvisReply("Transaction edit cancelled.");
  };

  // Temporarily replace summary with editing form or add modal
  // For simplicity, let's just make a temporary list item if we render list
  // As budget is a chart, editing individual transactions is usually done in a detailed list view.
  // For now, we'll make a popup/console log the "edit" functionality.
  // Given the current UI, direct in-place editing of chart bars isn't practical.
  // We'll modify budgetSummaryEl to show edit interface.
  budgetSummaryEl.innerHTML = '';
  budgetSummaryEl.appendChild(document.createTextNode('Edit Transaction (ID: ' + id + '): '));
  budgetSummaryEl.appendChild(amountInput);
  budgetSummaryEl.appendChild(descInput);
  budgetSummaryEl.appendChild(typeSelect);
  budgetSummaryEl.appendChild(saveBtn);
  budgetSummaryEl.appendChild(cancelBtn);
  speakJarvisReply("Editing transaction. Use the form below the chart to save or cancel.");
}

/**
 * Deletes a transaction from the list.
 * @param {number} id - The ID of the transaction to delete.
 */
function deleteTransaction(id) {
  const originalLength = transactions.length;
  transactions = transactions.filter(t => t.id !== id);
  if (transactions.length < originalLength) {
    saveAllData();
    renderBudgetChart();
    updateBudgetSummary();
    speakJarvisReply("Transaction deleted.");
  } else {
    speakJarvisReply("Failed to delete transaction.");
  }
}

/**
 * Sets the monthly budget goal.
 * @param {number} amount - The goal amount.
 */
function setBudgetGoal(amount) {
  if (!amount || isNaN(amount) || amount <= 0) {
    speakJarvisReply("Please enter a valid positive budget goal amount.");
    return;
  }
  budgetGoal = parseFloat(amount);
  saveAllData();
  updateBudgetGoalUI();
  renderBudgetChart();
  updateBudgetSummary();
  checkBadges();
  speakJarvisReply(`Monthly budget goal set to $${amount}.`);
}

/**
 * Updates the display for the current budget goal.
 */
function updateBudgetGoalUI() {
  if (budgetGoal !== null) {
    currentBudgetGoalEl.textContent = `Monthly Goal: $${budgetGoal.toFixed(2)}`;
  } else {
    currentBudgetGoalEl.textContent = "No budget goal set.";
  }
}

/**
 * Updates the budget summary text with current income, expenses, and goal.
 */
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
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)} (Income: $${monthlyIncome.toFixed(2)}). Of your $${budgetGoal.toFixed(2)} goal, ${percentageUsed}% used. Remaining: $${remainingBudget.toFixed(2)}.`;
    if (monthlyExpenses > budgetGoal) {
      summaryText += "<br>You are **over budget!**";
    } else if (remainingBudget < budgetGoal * 0.25) { // Less than 25% remaining
        summaryText += "<br>You're running low on budget!";
    }
  } else {
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)}. Income: $${monthlyIncome.toFixed(2)}.`;
  }
  
  // Add controls for transactions if budgetSummaryEl is used for that
  const recentTransactionsHTML = transactions
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5) // Show last 5 transactions
      .map(t => `<div class="transaction-item">
                     <span>${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)} (${t.description})</span>
                     <button class="action-btn edit-transaction-btn" data-id="${t.id}">&#9998;</button>
                     <button class="action-btn delete-transaction-btn" data-id="${t.id}">&#128465;</button>
                 </div>`)
      .join('');

  budgetSummaryEl.innerHTML = `<div>${summaryText}</div><br>
                               <h4>Recent Transactions:</h4>
                               <div class="recent-transactions-list">${recentTransactionsHTML}</div>`;
  
  // Attach event listeners to new transaction buttons
  document.querySelectorAll('.edit-transaction-btn').forEach(button => {
      button.onclick = (e) => {
          e.stopPropagation();
          // Simplified edit for transactions for now, could open a modal
          const id = parseInt(button.dataset.id);
          const trans = transactions.find(t => t.id === id);
          if (trans) {
              const newAmount = prompt(`Edit amount for '${trans.description}' (current: $${trans.amount}):`, trans.amount);
              if (newAmount !== null && !isNaN(newAmount) && parseFloat(newAmount) > 0) {
                  trans.amount = parseFloat(newAmount);
                  saveAllData();
                  renderBudgetChart();
                  updateBudgetSummary();
                  speakJarvisReply(`Amount for '${trans.description}' updated to $${newAmount}.`);
              }
          }
      };
  });
  document.querySelectorAll('.delete-transaction-btn').forEach(button => {
      button.onclick = (e) => {
          e.stopPropagation();
          const id = parseInt(button.dataset.id);
          deleteTransaction(id);
      };
  });
}

/**
 * Renders the budget chart (bar chart of monthly expenses).
 */
function renderBudgetChart() {
  const ctx = budgetChartCtx;
  const canvasWidth = budgetChartCanvas.width;
  const canvasHeight = budgetChartCanvas.height;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const rootStyles = getComputedStyle(document.documentElement);
  const barColor = rootStyles.getPropertyValue('--primary-color').trim();
  const textColor = rootStyles.getPropertyValue('--color-text').trim();
  const borderColor = rootStyles.getPropertyValue('--border-color').trim();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlySpending = Array(6).fill(0);
  const monthLabels = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })); // Display month and year

    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.timestamp).getMonth() === month && new Date(t.timestamp).getFullYear() === year)
      .reduce((sum, t) => sum + t.amount, 0);
    monthlySpending[5 - i] = monthExpenses;
  }

  const maxSpending = Math.max(...monthlySpending, budgetGoal || 0);
  const displayMax = maxSpending > 0 ? maxSpending * 1.15 : 100; // 15% buffer

  const chartAreaHeight = canvasHeight - 40; // Space for labels at top/bottom
  const barWidth = 30;
  const gap = (canvasWidth - (barWidth * 6)) / 7;
  const startX = gap;

  ctx.fillStyle = barColor;
  ctx.font = "10px " + rootStyles.getPropertyValue('--font-family-primary').trim();
  ctx.textAlign = "center";

  monthlySpending.forEach((value, i) => {
    const barHeight = (value / displayMax) * chartAreaHeight;
    ctx.fillRect(startX + i * (barWidth + gap), canvasHeight - 20 - barHeight, barWidth, barHeight);

    ctx.fillStyle = textColor;
    ctx.fillText(`$${value.toFixed(0)}`, startX + i * (barWidth + gap) + barWidth / 2, canvasHeight - 25 - barHeight); // Value on top
    ctx.fillText(monthLabels[i], startX + i * (barWidth + gap) + barWidth / 2, canvasHeight - 5); // Month label
  });

  if (budgetGoal !== null && displayMax > 0) {
    ctx.strokeStyle = rootStyles.getPropertyValue('--primary-color');
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]); // Dashed line
    const goalY = canvasHeight - 20 - (budgetGoal / displayMax) * chartAreaHeight;
    ctx.beginPath();
    ctx.moveTo(0, goalY);
    ctx.lineTo(canvasWidth, goalY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    ctx.fillStyle = rootStyles.getPropertyValue('--primary-color');
    ctx.textAlign = "left";
    ctx.fillText(`Goal: $${budgetGoal.toFixed(0)}`, 5, goalY - 8);
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight - 20);
  ctx.lineTo(canvasWidth, canvasHeight - 20);
  ctx.stroke();
}


// ========================
// Voice Recognition & Jarvis Core
// ========================

/**
 * Makes Jarvis speak the given text and displays it in the reply area.
 * @param {string} text - The text for Jarvis to speak.
 */
function speakJarvisReply(text) {
  jarvisReplyEl.textContent = text; // Always show text in the UI
  if ('speechSynthesis' in window) {
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
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    speakJarvisReply("Sorry, your browser does not support Speech Recognition. Try Chrome or Edge.");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionInstance = new SpeechRecognition();

  recognitionInstance.continuous = true; // Keep listening for continuous commands
  recognitionInstance.interimResults = false; // Only return final results
  recognitionInstance.lang = "en-US";

  recognitionInstance.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
    startBtn.disabled = true;
    speakJarvisReply("Jarvis is active. Say 'Hey Jarvis' followed by a command.");
  };

  recognitionInstance.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
  };

  recognitionInstance.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    speakJarvisReply(`Speech recognition error: ${event.error}. Please try again.`);
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
  };

  recognitionInstance.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    userSpeechEl.textContent = `You said: "${transcript}"`;

    if (/^(jarvis|hey jarvis)/i.test(transcript)) {
      const command = transcript.replace(/^(jarvis|hey jarvis)\s*/i, "").trim();
      if (command) {
        handleCommand(command.toLowerCase());
      } else {
        speakJarvisReply("Yes, how can I help?");
      }
    } else {
      // If no "Jarvis" keyword, it's just general speech
      jarvisReplyEl.textContent = "Listening..."; // Keep a clear state in UI
    }
  };

  return recognitionInstance;
}

/**
 * Handles incoming voice commands from the user.
 * @param {string} command - The voice command in lowercase.
 */
function handleCommand(command) {
  let response = "";

  if (command.includes("time")) {
    const now = new Date();
    response = `The current time is ${now.toLocaleTimeString()}.`;
  } else if (command.includes("date")) {
    const today = new Date();
    response = `Today's date is ${today.toLocaleDateString()}.`;
  } else if (command.includes("list tasks")) {
    const incomplete = tasks.filter(t => !t.completed);
    response = incomplete.length ? `You have ${incomplete.length} tasks pending: ${incomplete.map(t => t.text).join(", ")}.` : "You have no pending tasks!";
  } else if (command.includes("add task")) {
    const match = command.match(/add task (.+)/);
    if (match && match[1]) {
      const taskText = match[1].trim();
      addTask(taskText, "", ""); // Add with no due date or category initially via voice
      response = `Task "${taskText}" added.`;
    } else {
      response = "Please specify the task to add.";
    }
  } else if (command.includes("complete task")) {
    const match = command.match(/complete task (.+)/);
    if (match && match[1]) {
      const taskNameToComplete = match[1].trim();
      const taskToComplete = tasks.find(t => t.text.toLowerCase().includes(taskNameToComplete.toLowerCase()) && !t.completed);
      if (taskToComplete) {
        completeTask(taskToComplete.id);
        return; // completeTask will speak its own reply
      } else {
        response = `Task "${taskNameToComplete}" not found or already completed.`;
      }
    } else {
      response = "Please specify the task name to complete.";
    }
  } else if (command.includes("add note")) {
    const match = command.match(/add note (.+)/);
    if (match && match[1]) {
      const noteText = match[1].trim();
      addNote(noteText, ""); // Add with no category initially via voice
      response = `Note "${noteText}" added.`;
    } else {
      response = "Please specify the note to add.";
    }
  } else if (command.includes("add expense") || command.includes("record expense")) {
      const match = command.match(/(?:add expense|record expense)\s+(\d+(\.\d{1,2})?)\s+for\s+(.+)/);
      if (match && match[1] && match[3]) {
          addTransaction(match[1], match[3], 'expense');
          return; // addTransaction will speak its own reply
      } else {
          response = "Please say 'add expense [amount] for [description]'.";
      }
  } else if (command.includes("add income") || command.includes("record income")) {
      const match = command.match(/(?:add income|record income)\s+(\d+(\.\d{1,2})?)\s+for\s+(.+)/);
      if (match && match[1] && match[3]) {
          addTransaction(match[1], match[3], 'income');
          return; // addTransaction will speak its own reply
      } else {
          response = "Please say 'add income [amount] for [description]'.";
      }
  }
  else if (command.includes("set budget goal to")) {
      const match = command.match(/set budget goal to (\d+(\.\d{1,2})?)/);
      if (match && match[1]) {
          setBudgetGoal(match[1]);
          return; // setBudgetGoal will speak its own reply
      } else {
          response = "Please say 'set budget goal to [amount]'.";
      }
  }
  else if (command.includes("what is my budget") || command.includes("budget status")) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = transactions
          .filter(t => t.type === 'expense' && new Date(t.timestamp).getMonth() === currentMonth && new Date(t.timestamp).getFullYear() === currentYear)
          .reduce((sum, t) => sum + t.amount, 0);

      if (budgetGoal !== null) {
          const remaining = budgetGoal - monthlyExpenses;
          response = `You have spent $${monthlyExpenses.toFixed(2)} this month out of your goal of $${budgetGoal.toFixed(2)}. You have $${remaining.toFixed(2)} remaining.`;
      } else {
          response = `You have spent $${monthlyExpenses.toFixed(2)} this month. You haven't set a monthly budget goal yet.`;
      }
  }
  else if (command.includes("daily recommendation") || command.includes("tell me something useful")) {
    response = dailyRecommendationTextEl.textContent;
  }
  else if (command.includes("theme")) {
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
      response = "Which theme would you like? Dark, light, or vibrant?";
    }
  } else if (command.includes("how many points do i have") || command.includes("my points")) {
    response = `You currently have ${points} productivity points.`;
  } else if (command.includes("what is my streak") || command.includes("my streak")) {
    response = `Your current streak is ${streak} day${streak === 1 ? "" : "s"}.`;
  } else if (command.includes("how are you")) {
    response = "I am functioning optimally, thank you for asking.";
  } else if (command.includes("who are you")) {
    response = "I am Jarvis, your personal AI assistant, designed to help you manage your tasks, notes, and finances.";
  } else if (command.includes("joke")) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
      "What do you call a fake noodle? An impasta!",
      "Parallel lines have so much in common. It's a shame they'll never meet."
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  } else if (command.includes("thank you") || command.includes("thanks")) {
    response = "You're welcome! I'm here to assist.";
  } else if (command.includes("goodbye") || command.includes("bye")) {
    response = "Goodbye! Have a productive day.";
    recognition.stop(); // Stop listening when saying goodbye
  } else {
    response = "I'm sorry, I don't understand that command yet. Please try another or use the manual entry.";
  }

  speakJarvisReply(response);
}

// --- Daily Recommendation Logic ---
const dailyRecommendations = [
    "Start your day by reviewing your top 3 most important tasks.",
    "Take a 15-minute break every 2 hours to recharge your focus.",
    "Prioritize tasks by urgency and importance.",
    "Review your budget and categorize any new transactions.",
    "Write down three things you are grateful for today.",
    "Clear your workspace for better productivity.",
    "Spend 30 minutes learning something new related to your goals.",
    "Plan your meals for the week to save time and money.",
    "Engage in light physical activity for at least 20 minutes.",
    "Reach out to one person you haven't spoken to in a while."
];

function generateDailyRecommendation() {
    const today = new Date().toDateString();
    let lastRecommendationDate = localStorage.getItem("jarvis_last_recommendation_date");
    let lastRecommendationIndex = parseInt(localStorage.getItem("jarvis_last_recommendation_index")) || 0;

    if (lastRecommendationDate !== today) {
        lastRecommendationIndex = (lastRecommendationIndex + 1) % dailyRecommendations.length;
        localStorage.setItem("jarvis_last_recommendation_date", today);
        localStorage.setItem("jarvis_last_recommendation_index", lastRecommendationIndex);
    }
    dailyRecommendationTextEl.textContent = dailyRecommendations[lastRecommendationIndex];
}

// ==========================
// Data Import/Export
// ==========================

exportDataBtn.addEventListener("click", () => {
  const allData = {
    tasks: tasks,
    notes: notes,
    transactions: transactions,
    budgetGoal: budgetGoal,
    streak: streak,
    lastCompletionDate: lastCompletionDate,
    points: points,
    badges: badges,
  };
  const dataStr = JSON.stringify(allData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jarvis_data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  speakJarvisReply("All your data has been exported successfully!");
});

importDataBtn.addEventListener("click", () => {
  importFileInput.click(); // Trigger the hidden file input click
});

importFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Basic validation and data loading
        if (importedData.tasks && Array.isArray(importedData.tasks)) {
          tasks = importedData.tasks;
        }
        if (importedData.notes && Array.isArray(importedData.notes)) {
          notes = importedData.notes;
        }
        if (importedData.transactions && Array.isArray(importedData.transactions)) {
          transactions = importedData.transactions;
        }
        if (importedData.hasOwnProperty('budgetGoal')) { // Check for existence as it can be null
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
          setTheme(importedData.theme); // Apply imported theme
        }

        saveAllData(); // Save imported data to localStorage
        loadAllData(); // Re-render UI based on new data
        speakJarvisReply("Data imported successfully!");
      } catch (error) {
        console.error("Error importing data:", error);
        speakJarvisReply("Failed to import data. Please ensure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
  }
});


// ==========================
// Theme Management
// ==========================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme; // Update global theme variable
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  renderBudgetChart(); // Re-render chart with new theme colors
  updateBudgetSummary(); // Re-render summary for text color if needed
}

function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("dark"); // Default to dark for immersive experience
  }
}

// ==========================
// Event Listeners & Initialization
// ==========================

// Activate/Deactivate Jarvis Voice
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

// Theme Selection
themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// Manual Input Event Listeners
addTaskBtn.addEventListener("click", () => {
  addTask(newTaskTextEl.value, newTaskDueDateEl.value, newTaskCategoryEl.value);
  newTaskTextEl.value = "";
  newTaskDueDateEl.value = "";
  newTaskCategoryEl.value = "";
});

addNoteBtn.addEventListener("click", () => {
  addNote(newNoteTextEl.value, newNoteCategoryEl.value);
  newNoteTextEl.value = "";
  newNoteCategoryEl.value = "";
});

addTransactionBtn.addEventListener("click", () => {
  addTransaction(transactionAmountEl.value, transactionDescriptionEl.value, transactionTypeEl.value);
  transactionAmountEl.value = "";
  transactionDescriptionEl.value = "";
  transactionTypeEl.value = "expense";
});

setBudgetGoalBtn.addEventListener("click", () => {
  setBudgetGoal(budgetGoalAmountEl.value);
  budgetGoalAmountEl.value = "";
});

// --- On Load ---
document.addEventListener("DOMContentLoaded", () => {
  loadAllData(); // Load all data including theme and gamification
  // Speech recognition is initialized when startBtn is clicked for the first time
});