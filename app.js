// --- Constants & State ---
const STORAGE_KEYS = {
  TASKS: "assistant_tasks",
  NOTES: "assistant_notes",
  BUDGET: "assistant_budget",
  STREAK: "assistant_streak",
  LAST_COMPLETION_DATE: "assistant_last_date",
  POINTS: "assistant_points",
  BADGES: "assistant_badges",
  THEME: "assistant_theme",
  VERSION: "assistant_version"
};
const DATA_VERSION = 2;

// --- Utility Functions ---
function saveData(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadData(key, fallback) {
  let data = localStorage.getItem(key);
  if (data) try { return JSON.parse(data); } catch { return fallback; }
  return fallback;
}
function migrateData() {
  let version = loadData(STORAGE_KEYS.VERSION, 1);
  if (version < DATA_VERSION) {
    // ...migration logic...
    saveData(STORAGE_KEYS.VERSION, DATA_VERSION);
  }
}

// --- Theme Management ---
let currentTheme = loadData(STORAGE_KEYS.THEME, "light");
function setTheme(theme) {
  document.body.classList.remove("light", "dark", "vibrant");
  document.body.classList.add(theme);
  currentTheme = theme;
  saveData(STORAGE_KEYS.THEME, theme);
  renderBudgetChart();
}
document.getElementById("themeSelect").addEventListener("change", e => setTheme(e.target.value));
setTheme(currentTheme);

// --- Task Management ---
let tasks = loadData(STORAGE_KEYS.TASKS, []);
function renderTasks() {
  const ul = document.getElementById("taskList");
  ul.innerHTML = "";
  tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  tasks.forEach(task => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${task.text}</b> (${task.dueDate}) [${task.priority}] ${task.completed ? "✅" : ""}`;
    li.style.cursor = !task.completed ? "pointer" : "default";
    li.title = "Click to mark complete";
    if (!task.completed) li.addEventListener("click", () => completeTask(task.id));
    ul.appendChild(li);
  });
}
function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    saveData(STORAGE_KEYS.TASKS, tasks);
    renderTasks();
    updateGamificationUI();
    renderHeatmap();
  }
}
function addTask(task) {
  tasks.push(task);
  saveData(STORAGE_KEYS.TASKS, tasks);
  renderTasks();
}
// ...Add logic for recurring, templates, statistics, smart suggestions...

// --- Budget Tracker ---
let budget = loadData(STORAGE_KEYS.BUDGET, []);
function renderBudgetChart() {
  const ctx = document.getElementById("budgetChart").getContext("2d");
  ctx.clearRect(0, 0, 300, 150);
  let months = [...new Set(budget.map(b => b.month))].sort();
  let spending = months.map(m => budget.filter(b => b.month === m && b.type === "expense").reduce((s, b) => s + b.amount, 0));
  let income = months.map(m => budget.filter(b => b.month === m && b.type === "income").reduce((s, b) => s + b.amount, 0));
  let max = Math.max(...spending, ...income, 1);
  spending.forEach((val, i) => {
    ctx.fillStyle = "#ff5c57";
    ctx.fillRect(i * 40 + 20, 140 - (val / max) * 130, 15, (val / max) * 130);
  });
  income.forEach((val, i) => {
    ctx.fillStyle = "#0078d7";
    ctx.fillRect(i * 40 + 40, 140 - (val / max) * 130, 15, (val / max) * 130);
  });
  ctx.strokeStyle = "#333";
  ctx.beginPath(); ctx.moveTo(15, 140); ctx.lineTo(300, 140); ctx.stroke();
  document.getElementById("budgetSummary").textContent = "This month: " +
    (spending[spending.length-1] ? `Spent $${spending[spending.length-1]}` : "No expenses") +
    ", " + (income[income.length-1] ? `Income $${income[income.length-1]}` : "No income");
}
// ...Add logic for goals, insights, recommendations...

// --- Notes Module ---
let notes = loadData(STORAGE_KEYS.NOTES, []);
function renderNotes(filter = "") {
  const ul = document.getElementById("notesList");
  ul.innerHTML = "";
  notes.filter(note => note.text.toLowerCase().includes(filter.toLowerCase())).forEach(note => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${note.title}</b>: ${renderMarkdown(note.text)}`;
    ul.appendChild(li);
  });
}
function renderMarkdown(text) {
  return text.replace(/(?:__|[*#])|\[(.*?)\]\((.*?)\)/g, '') // basic markdown strip
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}
document.getElementById("searchNotes").addEventListener("input", e => renderNotes(e.target.value));
// ...Add logic for templates, categories, tags, related notes...

// --- Gamification ---
let streak = loadData(STORAGE_KEYS.STREAK, 0);
let lastCompletionDate = loadData(STORAGE_KEYS.LAST_COMPLETION_DATE, null);
let points = loadData(STORAGE_KEYS.POINTS, 0);
let badges = loadData(STORAGE_KEYS.BADGES, []);
function updateGamificationUI() {
  document.getElementById("streakCount").textContent = streak;
  document.getElementById("pointsCount").textContent = points;
  let badgesEl = document.getElementById("badges");
  badgesEl.innerHTML = "";
  badges.forEach(badge => {
    let span = document.createElement("span");
    span.className = "badge";
    span.textContent = badge;
    badgesEl.appendChild(span);
  });
}
function checkAndUpdateStreak() {
  const today = new Date().toDateString();
  if (!lastCompletionDate) { streak = 1; }
  else {
    const lastDate = new Date(lastCompletionDate);
    const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) streak++;
    else if (diffDays > 1) streak = 1;
  }
  lastCompletionDate = today;
  saveData(STORAGE_KEYS.STREAK, streak);
  saveData(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
  checkBadges();
}
function addPoints(val) {
  points += val;
  saveData(STORAGE_KEYS.POINTS, points);
  checkBadges();
}
function checkBadges() {
  if (points >= 50 && !badges.includes("Productivity Pro")) badges.push("Productivity Pro");
  if (streak >= 5 && !badges.includes("5-Day Streak")) badges.push("5-Day Streak");
  if (streak >= 10 && !badges.includes("10-Day Streak")) badges.push("10-Day Streak");
  if (tasks.every(t => t.completed) && !badges.includes("All Tasks Done")) badges.push("All Tasks Done");
  saveData(STORAGE_KEYS.BADGES, badges);
  updateGamificationUI();
}

// --- Productivity Heatmap ---
function renderHeatmap() {
  const ctx = document.getElementById("heatmap").getContext("2d");
  ctx.clearRect(0, 0, 300, 50);
  for (let i = 0; i < 30; i++) {
    let completed = Math.random() > 0.5 ? 1 : 0; // Replace with real stats
    ctx.fillStyle = completed ? "#0078d7" : "#ccc";
    ctx.fillRect(i * 10, 10, 8, 30);
  }
}

// --- Export/Import ---
document.getElementById("exportBtn").onclick = () => {
  const data = {
    tasks, notes, budget, streak, lastCompletionDate, points, badges, currentTheme, version: DATA_VERSION
  };
  const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "assistant_data.json";
  a.click();
  URL.revokeObjectURL(url);
};
document.getElementById("importBtn").onclick = () => document.getElementById("importInput").click();
document.getElementById("importInput").onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.tasks && data.notes && data.budget) {
        tasks = data.tasks; notes = data.notes; budget = data.budget;
        streak = data.streak; lastCompletionDate = data.lastCompletionDate;
        points = data.points; badges = data.badges; currentTheme = data.currentTheme;
        saveData(STORAGE_KEYS.TASKS, tasks);
        saveData(STORAGE_KEYS.NOTES, notes);
        saveData(STORAGE_KEYS.BUDGET, budget);
        saveData(STORAGE_KEYS.STREAK, streak);
        saveData(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
        saveData(STORAGE_KEYS.POINTS, points);
        saveData(STORAGE_KEYS.BADGES, badges);
        saveData(STORAGE_KEYS.THEME, currentTheme);
        setTheme(currentTheme);
        renderAll();
        alert("Data imported!");
      } else throw "Invalid file";
    } catch { alert("Import failed. Invalid file."); }
  };
  reader.readAsText(file);
};

// --- Daily Recommendation ---
function renderRecommendation() {
  let rec = "Start with tasks closest to deadline.";
  document.getElementById("dailyRecommendation").textContent = rec;
}

// --- Initialization ---
function renderAll() {
  renderTasks();
  renderNotes();
  renderBudgetChart();
  renderHeatmap();
  updateGamificationUI();
  renderRecommendation();
}
migrateData();
renderAll();

// --- Manual Assistant (Command Input) ---
document.getElementById("manualBtn").onclick = function() {
  const cmd = document.getElementById("manualInput").value.trim();
  if (cmd) handleCommand(cmd.toLowerCase());
};

// --- Jarvis (Voice Assistant) ---
let recognition;
let listening = false;
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
    document.getElementById("startBtn").textContent = "Listening...";
    document.getElementById("startBtn").disabled = true;
  };
  recognition.onend = () => {
    listening = false;
    document.getElementById("startBtn").textContent = "Activate Jarvis";
    document.getElementById("startBtn").disabled = false;
  };
  recognition.onerror = (event) => { console.error("Speech recognition error", event.error); };
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    document.getElementById("userSpeech").textContent = transcript;
    if (/^(jarvis|hey jarvis)/i.test(transcript)) {
      const command = transcript.replace(/^(jarvis|hey jarvis)/i, "").trim();
      if (command) handleCommand(command.toLowerCase());
      else document.getElementById("jarvisReply").textContent = "";
    } else {
      document.getElementById("jarvisReply").textContent = "";
    }
  };
  return recognition;
}
document.getElementById("startBtn").addEventListener("click", () => {
  if (!recognition) recognition = initSpeechRecognition();
  if (!listening) recognition.start();
  else recognition.stop();
});

// --- Command Handler (Manual & Voice) ---
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
    if (command.includes("dark")) { setTheme("dark"); response = "Dark theme activated."; }
    else if (command.includes("light")) { setTheme("light"); response = "Light theme activated."; }
    else if (command.includes("vibrant")) { setTheme("vibrant"); response = "Vibrant theme activated."; }
    else { response = "Please specify a valid theme: light, dark, or vibrant."; }
  } else if (command.includes("points")) {
    response = `You have ${points} points. Keep going!`;
  } else if (command.includes("streak")) {
    response = `Your current streak is ${streak} day${streak === 1 ? "" : "s"}.`;
  } else {
    response = "Sorry, I didn't understand that command.";
  }
  document.getElementById("jarvisReply").textContent = response;
}
