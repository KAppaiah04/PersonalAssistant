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

// Manual Input Elements
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const budgetInput = document.getElementById("budgetInput");
const addBudgetBtn = document.getElementById("addBudgetBtn");

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
  ctx.moveTo(20, 140);
  ctx.lineTo(280, 140);
  ctx.stroke();
}

// Theme switching
function setTheme(theme) {
  currentTheme = theme;
  document.body.className = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  renderBudgetChart(); // Redraw chart with new colors
}

// Initialize speech recognition
function initSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!window.SpeechRecognition) {
    userSpeech.textContent = "Speech Recognition not supported.";
    return null;
  }

  const recognition = new window.SpeechRecognition();
  recognition.continuous = true; // Listen continuously
  recognition.interimResults = true; // Get partial results

  recognition.onstart = () => {
    listening = true;
    startBtn.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');

    userSpeech.textContent = transcript;

    // Basic command handling (example)
    if (transcript.toLowerCase().includes("hey jarvis")) {
        handleCommand(transcript.toLowerCase());
    } else { // Manual mode or other speech, don't reply
        jarvisReply.textContent = "";
    }
  };

  recognition.onend = () => {
    listening = false;
    startBtn.textContent = "Activate Jarvis";
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    userSpeech.textContent = "Speech recognition error.";
    listening = false;
    startBtn.textContent = "Activate Jarvis";
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
      response = incomplete.length ? `You have ${incomplete.length} incomplete tasks: ${incomplete.join(", ")}` : "All tasks are complete.";
  } else if (command.includes("add task")) {
        const taskText = command.split("add task")[1].trim();
        if (taskText) {
            tasks.push({id: tasks.length + 1, text: taskText, completed: false, dueDate: "2025-06-20"}); // Example due date
            renderTasks();
            response = `Added task: ${taskText}`;
        } else {
            response = "What task do you want to add?";
        }
  }
  jarvisReply.textContent = response;
}


// Event listeners
startBtn.addEventListener("click", () => {
  if (listening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

themeSelect.addEventListener("change", (e) => {
  setTheme(e.target.value);
});

// Manual Input Event Listeners
addTaskBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();
    if (taskText) {
        tasks.push({id: tasks.length + 1, text: taskText, completed: false, dueDate: "2025-06-20"}); // Example due date
        renderTasks();
        taskInput.value = ""; // Clear input
    }
});

addNoteBtn.addEventListener("click", () => {
    const noteText = noteInput.value.trim();
    if (noteText) {
        notes.push(noteText);
        renderNotes();
        noteInput.value = "";
    }
});

addBudgetBtn.addEventListener("click", () => {
    const budgetValue = parseFloat(budgetInput.value);
    if (!isNaN(budgetValue)) {
        budgetData.push(budgetValue);
        renderBudgetChart();
        budgetInput.value = "";
    }
});


// Initialization
const recognition = initSpeechRecognition();
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
setTheme(savedTheme);
renderTasks();
renderNotes();
renderBudgetChart();
updateGamificationUI();