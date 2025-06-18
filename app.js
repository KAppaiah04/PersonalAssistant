// ==========================
// Jarvis Personal AI Assistant App
// ==========================

// --- DOM Elements ---
const startBtn = document.getElementById("startBtn");
const userSpeechEl = document.getElementById("userSpeech");
const jarvisReplyEl = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetChartCanvas = document.getElementById("budgetChart"); // Renamed for clarity
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

// Data Management Elements
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const dailyRecommendationTextEl = document.getElementById("dailyRecommendationText");


let recognition;
let listening = false;
let currentTheme = 'dark'; // Default to dark for Netflix-like UI

// --- Data Models (will be loaded from localStorage) ---
let tasks = [];
let notes = [];
let transactions = []; // Can include both income and expense
let budgetGoal = null;

// --- Gamification state saved in localStorage ---
let streak = 0;
let lastCompletionDate = null;
let points = 0;
let badges = [];

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
  budgetGoal = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_GOAL)); // budgetGoal can be null

  updateGamificationUI();
  renderTasks();
  renderNotes();
  renderBudgetChart(); // This needs currentTheme to be set.
  updateBudgetSummary();
  updateBudgetGoalUI();
  loadTheme(); // Load theme after body is available, ensures chart renders with correct colors
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

// --- Gamification Functions ---
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
    } else {
      // Same day, don't increment streak, just update lastCompletionDate if multiple tasks completed
    }
  }
  lastCompletionDate = today;
  saveAllData();
}

function addPoints(value) {
  points += value;
  saveAllData();
  checkBadges();
  updateGamificationUI();
}

function checkBadges() {
  // Define badges and their conditions
  const allBadges = [
    { name: "Productivity Pro", condition: () => points >= 50 },
    { name: "5-Day Streak", condition: () => streak >= 5 },
    { name: "10-Day Streak", condition: () => streak >= 10 },
    { name: "Task Master", condition: () => tasks.filter(t => t.completed).length >= 10 },
    { name: "Budget Buddy", condition: () => transactions.length >= 5 && budgetGoal !== null }
    // Add more badge conditions here
  ];

  allBadges.forEach(b => {
    if (b.condition() && !badges.includes(b.name)) {
      badges.push(b.name);
      speakJarvisReply(`Congratulations! You earned the "${b.name}" badge!`); // Speak badge achievement
    }
  });
  saveAllData();
}

// --- Task Management Functions ---
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

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10); // Award points for completion
    checkAndUpdateStreak(); // Update streak logic
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

function renderTasks() {
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    taskList.textContent = "No tasks yet. Add one using the form above or voice command!";
    return;
  }
  // Sort: incomplete first, then by earliest due date
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Incomplete tasks come first
    }
    // Handle cases where dueDate might be empty or null
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate) return -1; // Tasks with due date before those without
    if (b.dueDate) return 1;
    return 0; // Maintain original order if no due dates
  });

  tasks.forEach(task => {
    const li = document.createElement("li");
    let taskInfo = task.text;
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0,0,0,0); // Normalize today to start of day
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0,0,0,0); // Normalize due date to start of day

      const isOverdue = !task.completed && dueDate < today;
      const isToday = !task.completed && dueDate.toDateString() === today.toDateString();

      taskInfo += ` (Due: ${task.dueDate}`;
      if (isOverdue) {
        taskInfo += ' - OVERDUE!';
        li.classList.add("overdue-task"); // Add class for specific styling
      } else if (isToday) {
        taskInfo += ' - TODAY!';
      }
      taskInfo += ')';
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

// --- Note Taking Functions ---
function addNote(text, category) {
  if (!text) {
    speakJarvisReply("Please provide a note.");
    return;
  }
  notes.push({ text, category, timestamp: new Date().toISOString() });
  saveAllData();
  renderNotes();
  speakJarvisReply(`Note "${text}" added.`);
}

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

// --- Budget Tracking Functions ---
function addTransaction(amount, description, type) {
  if (!amount || isNaN(amount) || amount <= 0) {
    speakJarvisReply("Please enter a valid amount for the transaction.");
    return;
  }
  transactions.push({ amount: parseFloat(amount), description, type, timestamp: new Date().toISOString() });
  saveAllData();
  renderBudgetChart();
  updateBudgetSummary();
  checkBadges(); // Check budget related badges
  speakJarvisReply(`${type === 'expense' ? 'Expense' : 'Income'} of $${amount} recorded.`);
}

function setBudgetGoal(amount) {
  if (!amount || isNaN(amount) || amount <= 0) {
    speakJarvisReply("Please enter a valid budget goal amount.");
    return;
  }
  budgetGoal = parseFloat(amount);
  saveAllData();
  updateBudgetGoalUI();
  renderBudgetChart();
  updateBudgetSummary();
  checkBadges(); // Check budget related badges
  speakJarvisReply(`Monthly budget goal set to $${amount}.`);
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
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)} (Income: $${monthlyIncome.toFixed(2)}). Of your $${budgetGoal.toFixed(2)} goal, ${percentageUsed}% used. Remaining: $${remainingBudget.toFixed(2)}.`;
    if (monthlyExpenses > budgetGoal) {
      summaryText += " You are **over budget!**";
    } else if (remainingBudget < budgetGoal * 0.25) { // Less than 25% remaining
        summaryText += " You're running low on budget!";
    }
  } else {
    summaryText = `This month: Spent $${monthlyExpenses.toFixed(2)}. Income: $${monthlyIncome.toFixed(2)}.`;
  }
  budgetSummaryEl.innerHTML = summaryText; // Use innerHTML to allow bold
}

// Budget chart (simple bar chart with Canvas API)
function renderBudgetChart() {
  const ctx = budgetChartCtx;
  const canvasWidth = budgetChartCanvas.width;
  const canvasHeight = budgetChartCanvas.height;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous chart

  // Determine colors based on current theme
  const rootStyles = getComputedStyle(document.documentElement);
  const barColor = rootStyles.getPropertyValue('--primary-color');
  const textColor = rootStyles.getPropertyValue('--color-text');
  const borderColor = rootStyles.getPropertyValue('--border-color');


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
  // Add a buffer to maxSpending if it's too low or zero to prevent division by zero or tiny bars
  const displayMax = maxSpending > 0 ? maxSpending * 1.1 : 100; // 10% buffer or default to 100

  const chartAreaHeight = canvasHeight - 30; // Leave space for labels
  const barWidth = 30;
  const gap = (canvasWidth - (barWidth * 6)) / 7; // Calculate dynamic gap
  const startX = gap; // Start X for first bar

  ctx.fillStyle = barColor; // Bar color
  ctx.font = "10px Arial";
  ctx.textAlign = "center";

  // Render bars
  monthlySpending.forEach((value, i) => {
    const barHeight = (value / displayMax) * chartAreaHeight;
    ctx.fillRect(startX + i * (barWidth + gap), canvasHeight - 20 - barHeight, barWidth, barHeight); // Adjust Y for base line

    // Draw month label
    ctx.fillStyle = textColor; // Text color
    ctx.fillText(monthLabels[i], startX + i * (barWidth + gap) + barWidth / 2, canvasHeight - 5); // Position below bars
  });

  // Draw budget goal line if set
  if (budgetGoal !== null && displayMax > 0) {
    ctx.strokeStyle = rootStyles.getPropertyValue('--primary-color'); // Use primary color for goal line
    ctx.lineWidth = 2;
    const goalY = canvasHeight - 20 - (budgetGoal / displayMax) * chartAreaHeight; // Adjust Y for base line
    ctx.beginPath();
    ctx.moveTo(0, goalY);
    ctx.lineTo(canvasWidth, goalY);
    ctx.stroke();
    ctx.fillStyle = rootStyles.getPropertyValue('--primary-color');
    ctx.textAlign = "left";
    ctx.fillText(`Goal: $${budgetGoal.toFixed(0)}`, 5, goalY - 5);
  }

  // X-axis line (base of bars)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight - 20);
  ctx.lineTo(canvasWidth, canvasHeight - 20);
  ctx.stroke();
}


// ========================
// Voice recognition & Jarvis Core
// ========================

// Function to make Jarvis speak
function speakJarvisReply(text) {
  jarvisReplyEl.textContent = text; // Always show text in the UI
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // You can customize voice, pitch, rate here if desired
    // Example: utterance.voice = speechSynthesis.getVoices().find(voice => voice.name === 'Google UK English Male');
    // utterance.rate = 1.0;
    // utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Speech Synthesis API not supported in this browser.");
  }
}


function initSpeechRecognition() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    speakJarvisReply("Sorry, your browser does not support Speech Recognition. Try Chrome or Edge.");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionInstance = new SpeechRecognition();

  recognitionInstance.continuous = true; // Keep listening
  recognitionInstance.interimResults = false; // Only final results
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
    // Don't clear reply, keep the last Jarvis response
  };

  recognitionInstance.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    speakJarvisReply(`Speech recognition error: ${event.error}. Please try again.`);
    listening = false; // Reset listening state on error
    startBtn.textContent = "Activate Jarvis";
    startBtn.disabled = false;
  };

  recognitionInstance.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    userSpeechEl.textContent = `You said: "${transcript}"`;

    if (/^(jarvis|hey jarvis)/i.test(transcript)) {
      const command = transcript.replace(/^(jarvis|hey jarvis)/i, "").trim();
      if (command) {
        handleCommand(command.toLowerCase());
      } else {
        speakJarvisReply("Yes, how can I help?");
      }
    } else {
      // If no "Jarvis" keyword, it's just general speech, don't reply as Jarvis
      jarvisReplyEl.textContent = "Listening..."; // Clear previous Jarvis response if any
    }
  };

  return recognitionInstance;
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
        completeTask(taskToComplete.id); // Call the existing completeTask function
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
  } else if (command.includes("theme")) {
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
  } else if (command.includes("how are you")) {
    response = "I am functioning optimally, thank you for asking.";
  } else if (command.includes("who are you")) {
    response = "I am Jarvis, your personal AI assistant, designed to help you manage your tasks, notes, and finances.";
  }
  else if (command.includes("joke")) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised.",
      "What do you call a fake noodle? An impasta!",
      "Parallel lines have so much in common. It's a shame they'll never meet."
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  }
  else if (command.includes("thank you") || command.includes("thanks")) {
    response = "You're welcome! I'm here to assist.";
  }
  else if (command.includes("goodbye") || command.includes("bye")) {
    response = "Goodbye! Have a productive day.";
    recognition.stop(); // Stop listening when saying goodbye
  }
  else {
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
        // New day, get a new recommendation
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

        // Merge or overwrite data based on preference (here, we overwrite for simplicity)
        tasks = importedData.tasks || [];
        notes = importedData.notes || [];
        transactions = importedData.transactions || [];
        budgetGoal = importedData.budgetGoal || null;
        streak = importedData.streak || 0;
        lastCompletionDate = importedData.lastCompletionDate || null;
        points = importedData.points || 0;
        badges = importedData.badges || [];

        saveAllData(); // Save imported data
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
}

function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme) {
    setTheme(savedTheme);
    themeSelect.value = savedTheme;
  } else {
    setTheme("dark"); // Default to dark if no theme saved
  }
}

// ==========================
// Event Listeners & Initialization
// ==========================

startBtn.addEventListener("click", () => {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (recognition) { // Ensure recognition is initialized before starting/stopping
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

// Manual Input Event Listeners
addTaskBtn.addEventListener("click", () => {
  addTask(newTaskTextEl.value, newTaskDueDateEl.value, newTaskCategoryEl.value);
  newTaskTextEl.value = "";
  newTaskDueDateEl.value = "";
  newTaskCategoryEl.value = ""; // Reset category selection
});

addNoteBtn.addEventListener("click", () => {
  addNote(newNoteTextEl.value, newNoteCategoryEl.value);
  newNoteTextEl.value = "";
  newNoteCategoryEl.value = ""; // Reset category selection
});

addTransactionBtn.addEventListener("click", () => {
  addTransaction(transactionAmountEl.value, transactionDescriptionEl.value, transactionTypeEl.value);
  transactionAmountEl.value = "";
  transactionDescriptionEl.value = "";
  transactionTypeEl.value = "expense"; // Reset to default
});

setBudgetGoalBtn.addEventListener("click", () => {
  setBudgetGoal(budgetGoalAmountEl.value);
  budgetGoalAmountEl.value = "";
});


// --- On Load ---
document.addEventListener("DOMContentLoaded", () => {
  loadAllData(); // Load all data including theme and gamification
  // initSpeechRecognition will be called when startBtn is clicked
});