// ==========================\
// Jarvis Voice Assistant App
// ==========================\

const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverview = document.getElementById("budgetOverview");
const budgetChartCanvas = document.getElementById("budgetChart"); // Get the canvas element directly
let myBudgetChart; // Declare a variable to hold the Chart.js instance

const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

let recognition;
let listening = false;
let currentTheme = 'light';

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_LOGIN: "jarvis_last_login",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks", // Key for tasks persistence
  NOTES: "jarvis_notes", // Key for notes persistence
  TRANSACTIONS: "jarvis_transactions" // Key for transactions persistence
};

// --- Data Arrays (Loaded from localStorage) ---
let tasks = [];
let notes = [];
let transactions = []; // New array for budget transactions

// =================
// Speech Recognition
// =================

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    jarvisReply.textContent = "Speech Recognition not supported in this browser.";
    startBtn.disabled = true;
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
    startBtn.style.backgroundColor = "var(--accent-color)";
    jarvisReply.textContent = "Listening for commands...";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    userSpeech.textContent = transcript;
    handleCommand(transcript.toLowerCase());
  };

  recognition.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--primary-color)";
    jarvisReply.textContent = "Jarvis is dormant. Click 'Activate Jarvis' to wake up.";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    jarvisReply.textContent = `Error: ${event.error}. Please try again.`;
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.style.backgroundColor = "var(--primary-color)";
  };

  return recognition;
}

// =================
// Command Handling
// =================

function handleCommand(command) {
  let response = "I didn't understand that command.";

  if (command.includes("hello jarvis") || command.includes("hey jarvis")) {
    response = "Hello there! How can I help you?";
  } else if (command.includes("what time is it")) {
    response = `The time is ${new Date().toLocaleTimeString()}.`;
  } else if (command.includes("what is today's date")) {
    response = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  } else if (command.includes("clear speech")) {
    userSpeech.textContent = "Say \"Hey Jarvis\" followed by a command...";
    jarvisReply.textContent = "Speech cleared.";
    return; // Don't update jarvisReply again
  }
  // Task Management Commands
  else if (command.includes("add task")) {
    const parts = command.split("add task");
    const taskDetails = parts[1].trim();
    // Simple parsing: assuming format "add task [description] due [YYYY-MM-DD]"
    const dueMatch = taskDetails.match(/due (\d{4}-\d{2}-\d{2})/);
    let dueDate = new Date().toISOString().slice(0, 10); // Default to today
    let taskText = taskDetails;

    if (dueMatch) {
        dueDate = dueMatch[1];
        taskText = taskDetails.replace(dueMatch[0], '').trim();
    }
    if (taskText) {
        addTask(taskText, dueDate);
        response = `Task "${taskText}" added successfully for ${dueDate}.`;
    } else {
        response = "Please tell me what task to add and optionally its due date. Example: 'add task buy groceries due 2025-06-25'.";
    }
  } else if (command.includes("complete task")) {
      const taskText = command.replace("complete task", "").trim();
      const taskToComplete = tasks.find(task => task.text.toLowerCase().includes(taskText));
      if (taskToComplete) {
          toggleTaskComplete(taskToComplete.id);
          response = `Task "${taskToComplete.text}" marked as completed.`;
      } else {
          response = "I couldn't find that task. Please try again with the full task name.";
      }
  } else if (command.includes("edit task")) {
      response = "To edit a task, please use the 'Edit' button next to the task in the dashboard.";
  }
  // Note-taking commands
  else if (command.includes("add note about")) {
      const noteContent = command.replace("add note about", "").trim();
      if (noteContent) {
          addNote(noteContent);
          response = `Note about "${noteContent}" added.`;
      } else {
          response = "Please provide content for the note. Example: 'add note about meeting with John'.";
      }
  }
  // Budget tracking commands
  else if (command.includes("record expense") || command.includes("add expense")) {
      const details = command.replace(/record |add /g, "").replace("expense", "").trim(); // Expecting "for [amount] in [category]"
      const amountMatch = details.match(/for (\d+(\.\d+)?)/);
      const categoryMatch = details.match(/in (.+)/);

      if (amountMatch && categoryMatch) {
          const amount = parseFloat(amountMatch[1]);
          const category = categoryMatch[1].trim();
          addTransaction('expense', amount, category);
          response = `Recorded an expense of ${amount} in ${category}.`;
      } else {
          response = "Please specify the amount and category. Example: 'record expense for 50 in groceries'.";
      }
  } else if (command.includes("record income") || command.includes("add income") || command.includes("received")) {
      const details = command.replace(/record |add /g, "").replace("income", "").replace("received", "").trim(); // Expecting " [amount] from [source]"
      const amountMatch = details.match(/(\d+(\.\d+)?)/);
      const categoryMatch = details.match(/from (.+)/); // Reusing category for source

      if (amountMatch && categoryMatch) {
          const amount = parseFloat(amountMatch[1]);
          const category = categoryMatch[1].trim();
          addTransaction('received', amount, category);
          response = `Recorded income of ${amount} from ${category}.`;
      } else {
          response = "Please specify the amount and source. Example: 'record income 100 from salary'.";
      }
  } else if (command.includes("show budget")) {
      // updateBudgetOverview() already provides a summary.
      // For detailed report, you might need a dedicated UI or further voice interaction.
      updateBudgetOverview(); // Refresh overview
      renderBudgetChart(); // Refresh chart
      response = "Here is your updated budget overview.";
  }

  jarvisReply.textContent = response;
}

// =================
// Task Management
// =================

function loadTasks() {
    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function renderTasks() {
  taskList.innerHTML = '';
  // Sort tasks by due date, incomplete first
  const sortedTasks = tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Incomplete tasks come first
    }
    return new Date(a.dueDate) - new Date(b.dueDate); // Then sort by due date
  });

  sortedTasks.forEach(task => {
    const li = document.createElement('li');
    li.textContent = `${task.text} (Due: ${task.dueDate})`;
    if (task.completed) {
      li.classList.add('completed');
    }

    const buttonContainer = document.createElement('span'); // To group buttons

    const completeBtn = document.createElement('button');
    completeBtn.textContent = task.completed ? 'Undo' : 'Complete';
    completeBtn.onclick = () => toggleTaskComplete(task.id);
    completeBtn.style.marginLeft = '10px';
    buttonContainer.appendChild(completeBtn);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
      const newText = prompt('Edit task description:', task.text);
      const newDueDate = prompt('Edit due date (YYYY-MM-DD):', task.dueDate);
      if (newText !== null && newDueDate !== null) { // Check if user didn't cancel
        editTask(task.id, newText, newDueDate);
      }
    };
    editBtn.style.marginLeft = '5px';
    buttonContainer.appendChild(editBtn);

    li.appendChild(buttonContainer);
    taskList.appendChild(li);
  });
}

function addTask(text, dueDate) {
  const newId = tasks.length > 0 ? Math.max(...tasks.map(task => task.id)) + 1 : 1;
  tasks.push({ id: newId, text, completed: false, dueDate });
  saveTasks();
  renderTasks();
  updateGamificationUI(); // A task was added, potentially affecting points/streak
}

function toggleTaskComplete(id) {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex > -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks();
    renderTasks();
    if (tasks[taskIndex].completed) {
        awardPoints(10); // Award points for completing a task
        jarvisReply.textContent = `Task "${tasks[taskIndex].text}" completed! You earned 10 points.`;
    } else {
        jarvisReply.textContent = `Task "${tasks[taskIndex].text}" marked incomplete.`;
    }
    updateGamificationUI();
  }
}

function editTask(id, newText, newDueDate) {
  const taskIndex = tasks.findIndex(task => task.id === id);
  if (taskIndex > -1) {
    tasks[taskIndex].text = newText;
    tasks[taskIndex].dueDate = newDueDate;
    saveTasks();
    renderTasks();
    jarvisReply.textContent = `Task "${newText}" updated.`;
  } else {
    jarvisReply.textContent = "Task not found.";
  }
}

// =================
// Note Taking
// =================

function loadNotes() {
    const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
    }
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

function renderNotes() {
  notesList.innerHTML = '';
  notes.forEach((note, index) => {
    const li = document.createElement('li');
    li.textContent = note;
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteNote(index);
    deleteBtn.style.marginLeft = '10px';
    li.appendChild(deleteBtn);
    notesList.appendChild(li);
  });
}

function addNote(content) {
  notes.push(content);
  saveNotes();
  renderNotes();
}

function deleteNote(index) {
  notes.splice(index, 1);
  saveNotes();
  renderNotes();
}

// =================
// Budget Tracking
// =================

function loadTransactions() {
    const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

function addTransaction(type, amount, category, date = new Date().toISOString().slice(0, 10)) {
  transactions.push({ type, amount: parseFloat(amount), category, date });
  saveTransactions();
  renderBudgetChart();
  updateBudgetOverview();
}

function renderBudgetChart() {
  // Destroy existing chart instance to prevent re-rendering issues
  if (myBudgetChart) {
    myBudgetChart.destroy();
  }

  // Aggregate data for the chart (e.g., monthly spending)
  const monthlySpending = {};
  const monthlyIncome = {};

  transactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (t.type === 'expense') {
      monthlySpending[month] = (monthlySpending[month] || 0) + t.amount;
    } else if (t.type === 'received') {
      monthlyIncome[month] = (monthlyIncome[month] || 0) + t.amount;
    }
  });

  // Get all unique months and sort them
  const allMonths = [...new Set([...Object.keys(monthlySpending), ...Object.keys(monthlyIncome)])].sort();

  const chartLabels = allMonths;
  const expenseData = allMonths.map(month => monthlySpending[month] || 0);
  const incomeData = allMonths.map(month => monthlyIncome[month] || 0);

  // If there's no data, show a message and hide the chart
  if (allMonths.length === 0) {
    budgetOverview.textContent = "No budget data available yet. Add some income or expenses!";
    budgetChartCanvas.style.display = 'none'; // Hide the canvas
    return;
  } else {
    budgetChartCanvas.style.display = 'block'; // Show the canvas if data exists
  }

  const ctx = budgetChartCanvas.getContext("2d");
  myBudgetChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Monthly Spending",
          data: expenseData,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
          fill: false,
          tension: 0.1
        },
        {
          label: "Monthly Income",
          data: incomeData,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
          fill: false,
          tension: 0.1
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amount'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        title: {
          display: true,
          text: 'Monthly Financial Overview'
        }
      }
    },
  });
}

function updateBudgetOverview() {
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReceived = transactions
    .filter(t => t.type === 'received')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalReceived - totalExpenses;

  // You can decide what "budget" means here. For simplicity, let's say totalReceived is your available budget for current period.
  // Or you could have a separate fixed budget variable.
  const budgetGoal = 2000; // Example: a fixed monthly budget goal

  let overviewText = `Total Income: ${totalReceived.toFixed(2)} | Total Expenses: ${totalExpenses.toFixed(2)} | Net Balance: ${netBalance.toFixed(2)}`;

  if (totalReceived > 0) {
      const expensePercentage = (totalExpenses / totalReceived * 100).toFixed(0);
      overviewText += ` (${expensePercentage}% of income spent)`;
  } else if (totalExpenses > 0) {
      overviewText += ` (No income recorded)`;
  }

  budgetOverview.textContent = overviewText;
}


// =================
// Gamification
// =================

let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
let lastLogin = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];

function updateGamificationUI() {
  streakCountEl.textContent = streak;
  pointsCountEl.textContent = points;
  badgesEl.innerHTML = '';
  if (badges.length === 0) {
    badgesEl.textContent = "No badges yet. Keep up the good work!";
  } else {
    badges.forEach(badge => {
      const span = document.createElement('span');
      span.classList.add('badge');
      span.textContent = badge;
      badgesEl.appendChild(span);
    });
  }
}

function awardPoints(amount) {
  points += amount;
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  updateGamificationUI();
  checkBadges();
}

function checkBadges() {
  if (points >= 100 && !badges.includes("Centurion")) {
    badges.push("Centurion");
    jarvisReply.textContent += " You've earned the 'Centurion' badge!";
  }
  if (points >= 500 && !badges.includes("Master Achiever")) {
    badges.push("Master Achiever");
    jarvisReply.textContent += " You've earned the 'Master Achiever' badge!";
  }
  if (streak >= 7 && !badges.includes("Week Streak")) {
    badges.push("Week Streak");
    jarvisReply.textContent += " You've earned the 'Week Streak' badge!";
  }
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
  updateGamificationUI();
}

function checkStreak() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastLogin) {
    const lastLoginDate = new Date(lastLogin);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate - lastLoginDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) { // If logged in yesterday
      streak++;
    } else if (diffDays > 1) { // If missed a day
      streak = 0;
    }
  } else { // First login
    streak = 1;
  }
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, today);
  updateGamificationUI();
}

// =================
// Theme management
// =================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  // Re-render chart to adapt to new theme colors if Chart.js handles it or you adjust colors
  renderBudgetChart();
}

function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("light"); // Default theme
  }
}

// =================
// Initialization
// =================

startBtn.addEventListener("click", () => {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (recognition) { // Ensure recognition was successfully initialized
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

// On load
document.addEventListener('DOMContentLoaded', () => {
    loadTheme(); // Load theme first to apply styles
    loadTasks();
    loadNotes();
    loadTransactions(); // Load transactions
    renderTasks();
    renderNotes();
    checkStreak(); // Update streak for today's login
    updateGamificationUI();
    renderBudgetChart(); // Render chart with loaded data
    updateBudgetOverview(); // Update budget text overview
});