// ==========================
// Jarvis Voice Assistant App
// ==========================

const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetOverview = document.getElementById("budgetOverview");
const budgetChart = document.getElementById("budgetChart").getContext("2d");
const streakCountEl = document.getElementById("streakCount");
const pointsCountEl = document.getElementById("pointsCount");
const badgesEl = document.getElementById("badges");
const themeSelect = document.getElementById("themeSelect");

let recognition;
let listening = false;
let currentTheme = 'light';

const tasks = [
  { id: 1, text: "Submit budget report", completed: false, dueDate: "2025-06-20" },
  { id: 2, text: "Finish AI presentation", completed: false, dueDate: "2025-06-19" },
  { id: 3, text: "Review project plan", completed: true, dueDate: "2025-06-18" },
];

const notes = [
  "AI project progress",
  "Meeting notes from 17th June",
];

const budgetData = [1000, 800, 600, 400, 200, 100]; // sample monthly spending data for chart

// --- Gamification state saved in localStorage ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
};

// --- Load gamification data ---
let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
let lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];

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
  localStorage.setItem(STORAGE_KEYS.STREAK, streak);
  localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
}

// Add points & check badges
function addPoints(value) {
  points += value;
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
  checkBadges();
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
  if (tasks.every(t => t.completed) && !badges.includes("All Tasks Done")) {
    badges.push("All Tasks Done");
  }
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

// Mark task completed (simulate)
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    renderTasks();
    updateGamificationUI();
  }
}

// Render tasks in UI
function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach(task => {
    const li = document.createElement("li");
    li.textContent = `${task.text} ${task.completed ? "(Done)" : ""}`;
    if (!task.completed) {
      li.style.cursor = "pointer";
      li.title = "Click to mark complete";
      li.addEventListener("click", () => completeTask(task.id));
    }
    taskList.appendChild(li);
  });
}

// Render notes in UI
function renderNotes() {
  notesList.innerHTML = "";
  notes.forEach(note => {
    const li = document.createElement("li");
    li.textContent = note;
    notesList.appendChild(li);
  });
}

// Budget chart (simple bar chart with Canvas API)
function renderBudgetChart() {
  const ctx = budgetChart;
  ctx.clearRect(0, 0, 300, 150);

  const maxBudget = Math.max(...budgetData);
  const barWidth = 30;
  const gap = 10;
  ctx.fillStyle = currentTheme === "dark" ? "#69c" : "#0078d7";

  budgetData.forEach((value, i) => {
    const barHeight = (value / maxBudget) * 130;
    ctx.fillRect(i * (barWidth + gap) + 20, 140 - barHeight, barWidth, barHeight);
  });

  // Axis line
  ctx.strokeStyle = currentTheme === "dark" ? "#aaa" : "#333";
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
      const task = tasks.find(t => t.text.toLowerCase() === taskName.toLowerCase());
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
  } else {
    response = "Sorry, I didn't understand that command.";
  }

  jarvisReply.textContent = response;
}

// Manual input support (optional)
// You can add a textbox + button for manual commands if you want

// =================
// Theme management
// =================

function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  renderBudgetChart();
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
updateGamificationUI();
loadTheme();
renderBudgetChart();
Hey! Looks like you shared a full-featured "Jarvis"-style personal assistant web app code with tasks, notes, gamification (points, streaks, badges), voice recognition, and theme switching. Super cool!

What do you want me to do with this?  
- Help debug or improve?  
- Add new features?  
- Explain parts of the code?  
- Help you customize the assistant responses or commands?  

Just let me know!
