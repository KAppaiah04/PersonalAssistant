// ==========================
// Jarvis Voice Assistant App
// ==========================

const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverviewEl = document.getElementById("budgetOverview"); // Renamed to avoid conflict
const budgetChart = document.getElementById("budgetChart").getContext("2d");
const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");
const dailyRecommendationEl = document.getElementById("dailyRecommendation"); // New element

let recognition;
let listening = false;
let currentTheme = 'light';

// Enhanced Data Structures
let tasks = JSON.parse(localStorage.getItem('jarvis_tasks')) || [
  { id: 1, text: "Submit budget report", completed: false, dueDate: "2025-06-20", priority: "High", category: "Work" },
  { id: 2, text: "Finish AI presentation", completed: false, dueDate: "2025-06-19", priority: "High", category: "Work" },
  { id: 3, text: "Review project plan", completed: true, dueDate: "2025-06-18", priority: "Medium", category: "Work" },
  { id: 4, text: "Buy groceries", completed: false, dueDate: "2025-06-21", priority: "Low", category: "Personal" },
  { id: 5, text: "Call insurance company", completed: false, dueDate: "2025-06-20", priority: "High", category: "Personal" },
];

let notes = JSON.parse(localStorage.getItem('jarvis_notes')) || [
  { id: 1, content: "AI project progress: Researched NLP libraries.", category: "Work", tags: ["AI", "NLP"] },
  { id: 2, content: "Meeting notes from 17th June: Discussed Q3 strategy.", category: "Work", tags: ["Meeting", "Strategy"] },
  { id: 3, content: "Ideas for new app features: Gamification and advanced voice commands.", category: "Personal", tags: ["Ideas", "App"] },
];

let budget = JSON.parse(localStorage.getItem('jarvis_budget')) || {
  monthlyGoal: 2000,
  transactions: [
    { id: 1, type: "expense", amount: 150, category: "Groceries", date: "2025-06-01" },
    { id: 2, type: "income", amount: 2500, category: "Salary", date: "2025-06-01" },
    { id: 3, type: "expense", amount: 50, category: "Transport", date: "2025-06-03" },
    { id: 4, type: "expense", amount: 120, category: "Entertainment", date: "2025-06-05" },
    { id: 5, type: "expense", amount: 300, category: "Rent", date: "2025-06-10" },
    { id: 6, type: "expense", amount: 35, category: "Groceries", date: "2025-06-12" },
  ],
};

// --- Gamification state saved in localStorage ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks",
  NOTES: "jarvis_notes",
  BUDGET: "jarvis_budget",
};

// --- Load gamification data ---
let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
let lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];

// --- Helper for localStorage ---
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Update streak UI
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
}

// Check if today is next day after last completion to increment streak
function checkAndUpdateStreak() {
  const today = new Date().toDateString();

  if (!lastCompletionDate) {
    // First completion ever
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
  saveData(STORAGE_KEYS.STREAK, streak);
  saveData(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
}

// Add points & check badges
function addPoints(value) {
  points += value;
  saveData(STORAGE_KEYS.POINTS, points);
  checkBadges();
}

// Check badges earned - Enhanced
function checkBadges() {
  // Badge conditions
  if (points >= 50 && !badges.includes("Productivity Pro")) {
    badges.push("Productivity Pro");
    triggerConfetti();
  }
  if (streak >= 5 && !badges.includes("5-Day Streak")) {
    badges.push("5-Day Streak");
    triggerConfetti();
  }
  if (streak >= 10 && !badges.includes("10-Day Streak")) {
    badges.push("10-Day Streak");
    triggerConfetti();
  }
  if (tasks.every(t => t.completed) && !badges.includes("All Tasks Done")) {
    badges.push("All Tasks Done");
    triggerConfetti();
  }
  const totalExpenses = budget.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  if (totalExpenses < budget.monthlyGoal * 0.8 && !badges.includes("Budget Master")) {
    badges.push("Budget Master");
    triggerConfetti();
  }
  saveData(STORAGE_KEYS.BADGES, badges);
}

// Mark task completed (simulate) - Enhanced
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10); // Base points
    // Award more points for high priority or overdue tasks
    if (task.priority === "High" || new Date(task.dueDate) < new Date()) {
      addPoints(5);
    }
    checkAndUpdateStreak();
    saveData(STORAGE_KEYS.TASKS, tasks);
    renderTasks();
    updateGamificationUI();
    renderDailyRecommendation(); // Update recommendation after task completion
  }
}

// Add a new task
function addTask(text, dueDate, priority = "Medium", category = "General") {
  const newTask = {
    id: tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    text,
    completed: false,
    dueDate,
    priority,
    category,
  };
  tasks.push(newTask);
  saveData(STORAGE_KEYS.TASKS, tasks);
  renderTasks();
  jarvisReply.textContent = `Task "${text}" added to your list.`;
}

// Render tasks in UI - Enhanced
function renderTasks() {
  taskList.innerHTML = "";
  // Sort tasks by due date and then priority (High > Medium > Low)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Overdue tasks first
    const now = new Date();
    const aOverdue = new Date(a.dueDate) < now && !a.completed;
    const bOverdue = new Date(b.dueDate) < now && !b.completed;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by due date
    const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;

    // Then by priority
    const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  sortedTasks.forEach(task => {
    const li = document.createElement("li");
    let taskText = `${task.text} (Due: ${task.dueDate}, Priority: ${task.priority}, Category: ${task.category})`;
    if (task.completed) {
      taskText += " (Done)";
      li.classList.add("completed-task"); // Add a class for styling
    } else if (new Date(task.dueDate) < new Date()) {
      li.classList.add("overdue-task"); // Add a class for overdue tasks
    }
    li.textContent = taskText;

    if (!task.completed) {
      li.style.cursor = "pointer";
      li.title = "Click to mark complete";
      li.addEventListener("click", () => completeTask(task.id));
    }
    taskList.appendChild(li);
  });
}

// Add a new note
function addNote(content, category = "General", tags = []) {
  const newNote = {
    id: notes.length ? Math.max(...notes.map(n => n.id)) + 1 : 1,
    content,
    category,
    tags,
  };
  notes.push(newNote);
  saveData(STORAGE_KEYS.NOTES, notes);
  renderNotes();
  jarvisReply.textContent = `Note added: "${content.substring(0, 30)}..."`;
}


// Render notes in UI - Enhanced
function renderNotes() {
  notesList.innerHTML = "";
  notes.forEach(note => {
    const li = document.createElement("li");
    li.textContent = `${note.content} (Category: ${note.category}, Tags: ${note.tags.join(', ')})`;
    notesList.appendChild(li);
  });
}

// Add a new budget transaction
function addTransaction(type, amount, category) {
  const newTransaction = {
    id: budget.transactions.length ? Math.max(...budget.transactions.map(t => t.id)) + 1 : 1,
    type,
    amount: parseFloat(amount),
    category,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  };
  budget.transactions.push(newTransaction);
  saveData(STORAGE_KEYS.BUDGET, budget);
  renderBudgetChart();
  renderBudgetOverview();
  jarvisReply.textContent = `${type === 'expense' ? 'Expense' : 'Income'} of $${amount} for ${category} recorded.`;
}

// Budget chart (simple bar chart with Canvas API) - Enhanced to use actual budget data
let myBudgetChart = null; // Store chart instance

function renderBudgetChart() {
  const ctx = budgetChart;
  if (myBudgetChart) {
    myBudgetChart.destroy(); // Destroy previous chart instance
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlySpending = {};
  budget.transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
    .forEach(t => {
      monthlySpending[t.category] = (monthlySpending[t.category] || 0) + t.amount;
    });

  const labels = Object.keys(monthlySpending);
  const data = Object.values(monthlySpending);

  // Fallback if no data
  if (labels.length === 0) {
    labels.push("No Expenses Yet");
    data.push(0);
  }

  myBudgetChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Monthly Spending by Category',
        data: data,
        backgroundColor: currentTheme === "dark" ? "#69c" : "#0078d7",
        borderColor: currentTheme === "dark" ? "#69c" : "#0078d7",
        borderWidth: 1
      }]
    },
    options: {
      responsive: false, // Control size manually
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: currentTheme === "dark" ? "#eee" : "#222",
          }
        },
        x: {
          ticks: {
            color: currentTheme === "dark" ? "#eee" : "#222",
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: currentTheme === "dark" ? "#eee" : "#222",
          }
        }
      }
    }
  });
}

// Render Budget Overview - Enhanced
function renderBudgetOverview() {
  const totalIncome = budget.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = budget.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingBudget = budget.monthlyGoal - totalExpenses;
  const percentageUsed = (totalExpenses / budget.monthlyGoal * 100).toFixed(0);

  let overviewText = `Monthly Goal: $${budget.monthlyGoal}. `;
  overviewText += `Total Income: $${totalIncome}. `;
  overviewText += `Total Expenses: $${totalExpenses}. `;
  overviewText += `Remaining Budget: $${remainingBudget}. `;
  overviewText += `${percentageUsed}% of your budget used this month.`;

  let spendingInsight = getBudgetInsights();
  if (spendingInsight) {
    overviewText += `<br>Spending Insight: ${spendingInsight}`;
  }

  budgetOverviewEl.innerHTML = overviewText;
}

// Get Budget Insights
function getBudgetInsights() {
  const monthlySpendingByCategory = {};
  budget.transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      monthlySpendingByCategory[t.category] = (monthlySpendingByCategory[t.category] || 0) + t.amount;
    });

  if (Object.keys(monthlySpendingByCategory).length === 0) {
    return "No expenses recorded yet this month.";
  }

  const sortedCategories = Object.entries(monthlySpendingByCategory).sort(([, a], [, b]) => b - a);
  const highestSpendingCategory = sortedCategories[0];

  let insight = `Your highest spending category this month is '${highestSpendingCategory[0]}' with $${highestSpendingCategory[1]}.`;

  const totalExpenses = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);
  if (totalExpenses > budget.monthlyGoal) {
    insight += " You are currently over your monthly budget goal. Consider cutting down on non-essential spending.";
  } else if (totalExpenses < budget.monthlyGoal * 0.5) {
    insight += " You are doing great at staying under budget!";
  } else {
    insight += " You are on track with your budget.";
  }
  return insight;
}


// Get Smart Task Recommendation
function getTaskRecommendation() {
  const pendingTasks = tasks.filter(t => !t.completed);
  if (pendingTasks.length === 0) {
    return "You have no pending tasks! Great job!";
  }

  // Prioritize overdue tasks
  const overdueTasks = pendingTasks.filter(t => new Date(t.dueDate) < new Date());
  if (overdueTasks.length > 0) {
    const highestPriorityOverdue = overdueTasks.sort((a, b) => {
      const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })[0];
    return `Your top priority is to complete "${highestPriorityOverdue.text}" which was due on ${highestPriorityOverdue.dueDate}.`;
  }

  // Then prioritize by closest due date and then high priority
  const recommendedTask = [...pendingTasks].sort((a, b) => {
    const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })[0];

  return `Consider focusing on "${recommendedTask.text}" which is due on ${recommendedTask.dueDate} and has a ${recommendedTask.priority} priority.`;
}

// Render Daily Recommendation
function renderDailyRecommendation() {
  const taskRec = getTaskRecommendation();
  const quote = getRandomMotivationalQuote();
  dailyRecommendationEl.innerHTML = `${taskRec}<br><br>Daily Boost: "${quote}"`;
}

// Get Random Motivational Quote
function getRandomMotivationalQuote() {
  const quotes = [
    "The best way to predict the future is to create it.",
    "Believe you can and you're halfway there.",
    "The only way to do great work is to love what you do.",
    "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn’t just find you. You have to go out and get it.",
    "The harder you work for something, the greater you’ll feel when you achieve it.",
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}


// Confetti animation (simple implementation)
function triggerConfetti() {
  const confettiCount = 50;
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    document.body.appendChild(confetti);
    confetti.addEventListener('animationend', () => {
      confetti.remove();
    });
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
  };

  recognition.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    jarvisReply.textContent = "Sorry, I encountered a speech recognition error. Please try again.";
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
        // If no command after "jarvis", don't reply, just listen
        jarvisReply.textContent = "";
      }
    } else {
      // Manual mode or other speech, don't reply
      jarvisReply.textContent = "";
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
    const incomplete = tasks.filter(t => !t.completed).map(t => t.text);
    response = incomplete.length ? `You have ${incomplete.length} tasks pending: ${incomplete.join(", ")}` : "You have no pending tasks!";
  } else if (command.includes("complete task")) {
    // Example: "complete task submit budget report"
    const match = command.match(/complete task (.+)/);
    if (match && match[1]) {
      const taskName = match[1].trim();
      const task = tasks.find(t => t.text.toLowerCase() === taskName.toLowerCase() && !t.completed);
      if (task) {
        completeTask(task.id);
        response = `Marked "${task.text}" as completed. Good job!`;
      } else {
        response = `Task "${taskName}" not found or already completed.`;
      }
    } else {
      response = "Please specify the task name to complete.";
    }
  } else if (command.includes("add task")) {
    // Example: "add task submit weekly report due tomorrow high priority work"
    const match = command.match(/add task (.+?) due (.+?)(?: priority (.+?))?(?: category (.+?))?$/);
    if (match) {
      const text = match[1].trim();
      let dueDate = match[2].trim();
      const priority = match[3] ? match[3].trim() : "Medium";
      const category = match[4] ? match[4].trim() : "General";

      // Basic date parsing (can be improved)
      if (dueDate.toLowerCase() === "today") {
        dueDate = new Date().toISOString().split('T')[0];
      } else if (dueDate.toLowerCase() === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
      }
      // You can add more robust date parsing here if needed

      addTask(text, dueDate, priority, category);
      return; // Exit to avoid general response
    } else {
      response = "To add a task, please say 'add task [task name] due [date] (optional: priority [priority]) (optional: category [category])'.";
    }
  } else if (command.includes("add note")) {
    // Example: "add note remember to buy milk for personal shopping list"
    const match = command.match(/add note (.+?)(?: for (.+?))?(?: tags (.+?))?$/);
    if (match) {
      const content = match[1].trim();
      const category = match[2] ? match[2].trim() : "General";
      const tags = match[3] ? match[3].split(',').map(tag => tag.trim()) : [];
      addNote(content, category, tags);
      return;
    } else {
      response = "To add a note, please say 'add note [note content] (optional: for [category]) (optional: tags [tag1, tag2])'.";
    }
  } else if (command.includes("log expense")) {
    // Example: "log expense 50 for groceries"
    const match = command.match(/log expense (\d+(\.\d{1,2})?) for (.+)/);
    if (match) {
      const amount = parseFloat(match[1]);
      const category = match[3].trim();
      addTransaction('expense', amount, category);
      return;
    } else {
      response = "To log an expense, please say 'log expense [amount] for [category]'.";
    }
  } else if (command.includes("log income")) {
    // Example: "log income 1000 for salary"
    const match = command.match(/log income (\d+(\.\d{1,2})?) for (.+)/);
    if (match) {
      const amount = parseFloat(match[1]);
      const category = match[3].trim();
      addTransaction('income', amount, category);
      return;
    } else {
      response = "To log income, please say 'log income [amount] for [category]'.";
    }
  } else if (command.includes("budget status")) {
    renderBudgetOverview();
    const totalExpenses = budget.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const percentageUsed = (totalExpenses / budget.monthlyGoal * 100).toFixed(0);
    response = `You have used ${percentageUsed}% of your monthly budget.`;
  } else if (command.includes("spending insights")) {
    response = getBudgetInsights();
  } else if (command.includes("task recommendation")) {
    response = getTaskRecommendation();
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
  } else if (command.includes("hello") || command.includes("hi")) {
    response = "Hello there! How can I assist you today?";
  } else if (command.includes("how are you")) {
    response = "I'm functioning optimally, thank you for asking!";
  } else if (command.includes("goodbye") || command.includes("bye")) {
    response = "Goodbye! Have a productive day.";
    if (listening) recognition.stop();
  } else {
    response = "Sorry, I didn't understand that command. Please try 'time', 'date', 'tasks', 'add task', 'complete task', 'add note', 'log expense', 'log income', 'budget status', 'spending insights', 'task recommendation', 'theme light/dark/vibrant', 'points', or 'streak'.";
  }

  jarvisReply.textContent = response;
  // Use Web Speech API for Jarvis's reply
  speak(response);
}

// Jarvis speaks the response
function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }
}

// Manual input support (optional) - Not explicitly asked, but useful for testing
// You can add a textbox + button for manual commands if you want

// =================
// Theme management
// =================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  renderBudgetChart(); // Re-render chart with new theme colors
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
  if (!listening) {
    recognition.start();
  } else {
    recognition.stop();
  }
});

themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// On load
renderTasks();
renderNotes();
renderBudgetOverview();
updateGamificationUI();
loadTheme();
renderBudgetChart();
renderDailyRecommendation(); // Initial daily recommendation