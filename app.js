// ==========================\
// Jarvis Voice Assistant App
// ==========================\

const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverview = document.getElementById("budgetOverview");
const budgetChartCanvas = document.getElementById("budgetChart"); // Get the canvas element
const budgetChartContext = budgetChartCanvas ? budgetChartCanvas.getContext("2d") : null; // Get context safely
const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

// New elements for adding tasks/notes/expenses
const newTaskInput = document.getElementById("newTaskInput");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const addTaskBtn = document.getElementById("addTaskBtn");
const newNoteInput = document.getElementById("newNoteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const newExpenseAmountInput = document.getElementById("newExpenseAmountInput");
const newExpenseDescInput = document.getElementById("newExpenseDescInput");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expensesList = document.getElementById("expensesList"); // New element for expense list
const totalExpensesDisplay = document.getElementById("totalExpensesDisplay"); // New element for total expenses

// Elements for export/import
const exportExpensesCsvBtn = document.getElementById("exportExpensesCsvBtn");
const importCsvFile = document.getElementById("importCsvFile");
const importCsvBtn = document.getElementById("importCsvBtn");

let recognition;
let listening = false;
let currentTheme = 'light';
let myBudgetChart; // Declare chart instance globally

// --- Storage Keys ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  EXPENSES: "jarvis_expenses", // Added for expense persistence
};

// --- Initial Data (load from localStorage or use defaults) ---
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || [
  { id: 1, text: "Submit budget report", completed: false, dueDate: "2025-06-20" },
  { id: 2, text: "Finish AI presentation", completed: false, dueDate: "2025-06-19" },
  { id: 3, text: "Review project plan", completed: true, dueDate: "2025-06-18" },
];

let notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [
  "AI project progress",
  "Meeting notes from 17th June",
];

// Expense data structure: [{id: 1, amount: 50, description: "Groceries", date: "2025-06-18"}]
let expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES)) || [
  { id: 1, amount: 150, description: "Groceries", date: "2025-06-10" },
  { id: 2, amount: 50, description: "Coffee", date: "2025-06-15" },
];

// --- Gamification state saved in localStorage ---
let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0', 10);
let lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS) || '0', 10);
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');

// =================
// Helper Functions for Storage
// =================

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

// =================
// Task Management
// =================

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';
    li.innerHTML = `
      <span onclick="completeTask(${task.id})">${task.text}</span>
      ${task.dueDate ? `<span class="due-date"> (Due: ${task.dueDate})</span>` : ''}
      <button class="delete-btn" onclick="deleteTask(${task.id})">x</button>
    `;
    taskList.appendChild(li);
  });
}

function addTask(text, dueDate) {
  if (text.trim() === "") {
    jarvisReply.textContent = "Please provide a description for the task.";
    return;
  }
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  tasks.push({ id: newId, text: text.trim(), completed: false, dueDate: dueDate });
  saveTasks();
  renderTasks();
  jarvisReply.textContent = `Task "${text}" added.`;
  addPoints(5);
  updateGamificationUI();
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    saveTasks();
    renderTasks();
    updateGamificationUI();
    jarvisReply.textContent = `Task "${task.text}" completed. Good job!`;
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  jarvisReply.textContent = "Task deleted.";
}

// =================
// Note-Taking
// =================

function renderNotes() {
  if (!notesList) return;
  notesList.innerHTML = '';
  notes.forEach((note, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${note}</span>
      <button class="delete-btn" onclick="deleteNote(${index})">x</button>
    `;
    notesList.appendChild(li);
  });
}

function addNote(text) {
  if (text.trim() === "") {
    jarvisReply.textContent = "Please provide content for the note.";
    return;
  }
  notes.push(text.trim());
  saveNotes();
  renderNotes();
  jarvisReply.textContent = `Note "${text.substring(0, 30)}..." added.`;
}

function deleteNote(index) {
  if (index > -1 && index < notes.length) {
    notes.splice(index, 1);
    saveNotes();
    renderNotes();
    jarvisReply.textContent = "Note deleted.";
  }
}

// =================
// Expense Tracking
// =================

function renderExpenses() {
  if (!expensesList || !totalExpensesDisplay) return;
  expensesList.innerHTML = '';
  let total = 0;
  expenses.forEach(expense => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>$${expense.amount.toFixed(2)} - ${expense.description} (${expense.date})</span>
      <button class="delete-btn" onclick="deleteExpense(${expense.id})">x</button>
    `;
    expensesList.appendChild(li);
    total += expense.amount;
  });
  totalExpensesDisplay.textContent = `Total: $${total.toFixed(2)}`;
  updateBudgetChartWithExpenses(total); // Update chart based on total expenses
}

function addExpense(amount, description) {
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    jarvisReply.textContent = "Please enter a valid positive amount for the expense.";
    return;
  }
  if (description.trim() === "") {
    jarvisReply.textContent = "Please enter a description for the expense.";
    return;
  }
  const newId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
  const today = new Date().toISOString().slice(0, 10);
  expenses.push({ id: newId, amount: parsedAmount, description: description.trim(), date: today });
  saveExpenses();
  renderExpenses();
  jarvisReply.textContent = `Expense of $${parsedAmount.toFixed(2)} for "${description}" added.`;
  addPoints(3); // Award points for tracking expenses
  updateGamificationUI();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses();
  jarvisReply.textContent = "Expense deleted.";
}

// =================
// Budget Overview & Chart
// =================

function updateBudgetChartWithExpenses(totalCurrentExpenses) {
  if (!budgetChartContext) return;

  // For a simple overview, let's just show current total vs a hypothetical budget
  const hypotheticalBudget = 1500; // Example monthly budget
  const dataForChart = [totalCurrentExpenses, Math.max(0, hypotheticalBudget - totalCurrentExpenses)]; // Ensure remaining is not negative
  const labelsForChart = ['Spent', 'Remaining'];
  const backgroundColors = [
    totalCurrentExpenses > hypotheticalBudget ? '#ff5c57' : '#0078d7', // Red if over, blue if under
    currentTheme === 'dark' ? '#3a86ff' : '#a0a0a0'
  ];

  if (myBudgetChart) {
    myBudgetChart.data.datasets[0].data = dataForChart;
    myBudgetChart.data.datasets[0].backgroundColor = backgroundColors;
    myBudgetChart.data.labels = labelsForChart;
    myBudgetChart.update();
  } else {
    myBudgetChart = new Chart(budgetChartContext, {
      type: 'pie', // Pie chart for simple spent/remaining view
      data: {
        labels: labelsForChart,
        datasets: [{
          label: 'Budget Overview',
          data: dataForChart,
          backgroundColor: backgroundColors,
          borderColor: currentTheme === 'dark' ? '#121212' : '#fff', // Border color to match background
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
              color: currentTheme === 'dark' ? '#eee' : '#222',
              font: {
                size: 14 // Larger legend font
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
            bodyFont: {
                size: 14 // Larger tooltip font
            },
            titleFont: {
                size: 16
            }
          }
        }
      }
    });
  }
  budgetOverview.textContent = `You have spent $${totalCurrentExpenses.toFixed(2)} out of $${hypotheticalBudget.toFixed(2)} this month.`;
}

// =======================
// Data Export Functionality (CSV)
// =======================

function exportExpensesToCsv() {
    if (expenses.length === 0) {
        jarvisReply.textContent = "No expenses to export!";
        return;
    }

    // CSV Header
    const headers = ["ID", "Amount", "Description", "Date"];
    const csvRows = [];
    csvRows.push(headers.join(",")); // Add header row

    // CSV Data Rows
    expenses.forEach(expense => {
        const row = [
            expense.id,
            expense.amount.toFixed(2), // Format amount to 2 decimal places
            `"${expense.description.replace(/"/g, '""')}"`, // Handle commas and quotes in description
            expense.date
        ];
        csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `jarvis_expenses_${date}.csv`; // Filename for download
    document.body.appendChild(a); // Append for Firefox compatibility
    a.click(); // Programmatically click the link to trigger download
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url); // Release the object URL

    jarvisReply.textContent = "Expenses exported to CSV!";
}

// =======================
// Data Import Functionality (Conceptual for CSV)
// =======================

function importCsvData(event) {
    const file = event.target.files[0];
    if (!file) {
        jarvisReply.textContent = "No file selected for import.";
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const csvContent = e.target.result;
        try {
            const parsedData = parseCsvToExpenses(csvContent);
            if (parsedData.length > 0) {
                // Option: Overwrite existing expenses with new data
                expenses = parsedData;
                jarvisReply.textContent = `Successfully imported ${parsedData.length} expenses (overwriting existing).`;

                // If you want to append instead of overwrite, you'd need to manage IDs to prevent duplicates
                // Example for appending with new IDs:
                // const currentMaxId = expenses.length > 0 ? Math.max(...expenses.map(e => e.id)) : 0;
                // parsedData.forEach((item, index) => {
                //     item.id = currentMaxId + index + 1; // Assign new unique IDs
                //     expenses.push(item);
                // });
                // jarvisReply.textContent = `Successfully imported ${parsedData.length} expenses (appended).`;

            } else {
                jarvisReply.textContent = "No valid expense data found in the CSV.";
            }
            saveExpenses();
            renderExpenses();
        } catch (error) {
            jarvisReply.textContent = `Error importing CSV: ${error.message}`;
            console.error("CSV import error:", error);
        }
    };

    reader.onerror = () => {
        jarvisReply.textContent = "Failed to read file.";
    };

    reader.readAsText(file);
}

// Simple CSV parser for expenses (assumes specific header order: ID, Amount, Description, Date)
function parseCsvToExpenses(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length <= 1) return []; // No data or only header

    // Assuming fixed header order for simplicity
    const headers = ["id", "amount", "description", "date"];
    const dataRows = lines.slice(1);
    const newExpenses = [];

    dataRows.forEach(row => {
        const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // More robust split for CSV (handles commas in quotes)
        if (values.length === headers.length) {
            const expense = {};
            headers.forEach((header, index) => {
                let value = values[index].trim();
                // Remove surrounding quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1).replace(/""/g, '"'); // Unescape double quotes
                }

                if (header === "amount") {
                    expense[header] = parseFloat(value);
                } else if (header === "id") {
                    expense[header] = parseInt(value, 10);
                } else {
                    expense[header] = value;
                }
            });
            // Basic validation
            if (!isNaN(expense.amount) && expense.amount > 0 && expense.description) {
                newExpenses.push(expense);
            }
        }
    });
    return newExpenses;
}


// =================
// Gamification
// =================

function addPoints(amount) {
  points += amount;
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
}

function checkAndUpdateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastCompletionDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (lastCompletionDate === yesterdayISO) {
    streak += 1;
    jarvisReply.textContent = `Streak! You're on a ${streak}-day streak!`;
  } else {
    streak = 1;
    jarvisReply.textContent = `New streak started!`;
  }
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, today);
  checkBadges();
}

function checkBadges() {
  if (points >= 100 && !badges.includes("Novice Achiever")) {
    badges.push("Novice Achiever");
    jarvisReply.textContent = "New Badge Unlocked: Novice Achiever!";
  }
  if (streak >= 7 && !badges.includes("7-Day Master")) {
    badges.push("7-Day Master");
    jarvisReply.textContent = "New Badge Unlocked: 7-Day Master!";
  }
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

function updateGamificationUI() {
  if (streakCountEl) streakCountEl.textContent = streak;
  if (pointsCountEl) pointsCountEl.textContent = points;
  if (badgesEl) {
    badgesEl.innerHTML = '';
    badges.forEach(badge => {
      const span = document.createElement('span');
      span.className = 'badge';
      span.textContent = badge;
      badgesEl.appendChild(span);
    });
  }
}

// =========================
// Speech Recognition (Web Speech API)
// =========================

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    jarvisReply.textContent = "Speech recognition not supported in this browser. Please use Chrome or Edge.";
    startBtn.disabled = true;
    return null;
  }

  const recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = false;
  recognitionInstance.lang = 'en-US';
  recognitionInstance.interimResults = false;
  recognitionInstance.maxAlternatives = 1;

  recognitionInstance.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
    startBtn.style.backgroundColor = "lightgreen";
    userSpeech.textContent = "Speak now...";
  };

  recognitionInstance.onresult = (event) => {
    const speechResult = event.results[0][0].transcript;
    userSpeech.textContent = `You said: "${speechResult}"`;
    handleCommand(speechResult.toLowerCase());
  };

  recognitionInstance.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--accent-color)";
    userSpeech.textContent = "Say \"Hey Jarvis\" followed by a command...";
  };

  recognitionInstance.onerror = (event) => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--accent-color)";
    jarvisReply.textContent = `Speech recognition error: ${event.error}`;
  };

  return recognitionInstance;
}

function handleCommand(command) {
  let response = "I didn't quite catch that. Can you repeat?";

  if (command.includes("hey jarvis") || command.includes("hi jarvis")) {
    if (command.includes("what can you do")) {
      response = "I can help you manage tasks, take notes, track expenses, and track your productivity.";
    } else if (command.includes("list my tasks")) {
      if (tasks.length > 0) {
        response = "Your tasks are: " + tasks.filter(t => !t.completed).map(t => t.text).join(", ") + ".";
      } else {
        response = "You have no pending tasks.";
      }
    } else if (command.includes("complete task")) {
      const taskText = command.replace("hey jarvis complete task", "").trim();
      const taskToComplete = tasks.find(t => t.text.toLowerCase().includes(taskText) && !t.completed);
      if (taskToComplete) {
        completeTask(taskToComplete.id);
        return;
      } else {
        response = "I couldn't find that task or it's already completed.";
      }
    } else if (command.includes("list my notes")) {
      if (notes.length > 0) {
        response = "Your notes are: " + notes.join("; ") + ".";
      } else {
        response = "You have no notes.";
      }
    } else if (command.includes("check my expenses") || command.includes("what are my expenses")) {
        if (expenses.length > 0) {
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            response = `You have recorded expenses totaling $${total.toFixed(2)}. Your recent expenses include: ${expenses.slice(-3).map(e => `${e.description} for $${e.amount.toFixed(2)}`).join(", ")}.`;
        } else {
            response = "You have no recorded expenses.";
        }
    } else if (command.includes("add task")) {
      const taskMatch = command.match(/add task (.+?)(?: due (.+))?$/);
      if (taskMatch && taskMatch[1]) {
        const taskText = taskMatch[1].trim();
        const dueDate = taskMatch[2] ? taskMatch[2].trim() : '';
        addTask(taskText, dueDate);
        return;
      } else {
        response = "Please specify the task to add, for example: 'add task buy groceries'.";
      }
    } else if (command.includes("add note")) {
      const noteMatch = command.match(/add note (.+)/);
      if (noteMatch && noteMatch[1]) {
        const noteText = noteMatch[1].trim();
        addNote(noteText);
        return;
      } else {
        response = "Please specify the note to add, for example: 'add note remember to call mom'.";
      }
    } else if (command.includes("add expense")) {
        const expenseMatch = command.match(/add expense (\d+\.?\d*)\s+for\s+(.+)/);
        if (expenseMatch && expenseMatch[1] && expenseMatch[2]) {
            const amount = parseFloat(expenseMatch[1]);
            const description = expenseMatch[2].trim();
            addExpense(amount, description);
            return;
        } else {
            response = "Please specify the expense amount and description, for example: 'add expense 30 for lunch'.";
        }
    }
    else if (command.includes("how am i doing")) {
      response = `You have ${points} points and a ${streak}-day streak. Keep up the good work!`;
    } else {
      response = "Hello. How can I assist you?";
    }
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
  // Re-render chart and expenses display to update colors/values
  renderExpenses(); // This will also trigger chart update
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

// =================
// Initialization
// =================

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

themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// Event listeners for new Add Task/Note/Expense buttons
if (addTaskBtn) {
  addTaskBtn.addEventListener("click", () => {
    addTask(newTaskInput.value, newTaskDueDate.value);
    newTaskInput.value = "";
    newTaskDueDate.value = "";
  });
}

if (addNoteBtn) {
  addNoteBtn.addEventListener("click", () => {
    addNote(newNoteInput.value);
    newNoteInput.value = "";
  });
}

if (addExpenseBtn) {
  addExpenseBtn.addEventListener("click", () => {
    addExpense(newExpenseAmountInput.value, newExpenseDescInput.value);
    newExpenseAmountInput.value = "";
    newExpenseDescInput.value = "";
  });
}

// Event listeners for export/import
if (exportExpensesCsvBtn) {
    exportExpensesCsvBtn.addEventListener("click", exportExpensesToCsv);
}

if (importCsvBtn) {
    importCsvBtn.addEventListener("click", () => {
        // Trigger the hidden file input click
        importCsvFile.click();
    });
}

if (importCsvFile) {
    importCsvFile.addEventListener("change", importCsvData);
}

// On load
renderTasks();
renderNotes();
renderExpenses(); // Render expenses on load
updateGamificationUI();
loadTheme();