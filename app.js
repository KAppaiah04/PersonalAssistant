// ==========================\
// Jarvis Voice Assistant App
// ==========================\

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

// New elements for adding tasks/notes
const newTaskInput = document.getElementById("newTaskInput");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const addTaskBtn = document.getElementById("addTaskBtn");
const newNoteInput = document.getElementById("newNoteInput");
const addNoteBtn = document.getElementById("addNoteBtn");

let recognition;
let listening = false;
let currentTheme = 'light';

// --- Storage Keys ---
const STORAGE_KEYS = {
  STREAK: "jarvis_streak",
  LAST_COMPLETION_DATE: "jarvis_last_date",
  POINTS: "jarvis_points",
  BADGES: "jarvis_badges",
  THEME: "jarvis_theme",
  TASKS: "jarvis_tasks", // Added for task persistence
  NOTES: "jarvis_notes", // Added for note persistence
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

const budgetData = [1000, 800, 600, 400, 200, 100]; // sample monthly spending data for chart

// --- Gamification state saved in localStorage ---
let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0', 10);
let lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS) || '0', 10);
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');

// =================
// Helper Functions
// =================

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

// =================
// Task Management
// =================

function renderTasks() {
  if (!taskList) return; // Ensure taskList element exists
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
  saveTasks(); // Save after adding
  renderTasks();
  jarvisReply.textContent = `Task "${text}" added.`;
  addPoints(5); // Award points for adding a task
  updateGamificationUI();
}

function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task && !task.completed) {
    task.completed = true;
    addPoints(10);
    checkAndUpdateStreak();
    saveTasks(); // Save after completing
    renderTasks();
    updateGamificationUI();
    jarvisReply.textContent = `Task "${task.text}" completed. Good job!`;
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(); // Save after deleting
  renderTasks();
  jarvisReply.textContent = "Task deleted.";
}

// =================
// Note-Taking
// =================

function renderNotes() {
  if (!notesList) return; // Ensure notesList element exists
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
  saveNotes(); // Save after adding
  renderNotes();
  jarvisReply.textContent = `Note "${text.substring(0, 30)}..." added.`;
}

function deleteNote(index) {
  if (index > -1 && index < notes.length) {
    notes.splice(index, 1);
    saveNotes(); // Save after deleting
    renderNotes();
    jarvisReply.textContent = "Note deleted.";
  }
}

// =================
// Budget Overview
// =================

function renderBudgetChart() {
  // Simple Bar Chart using Chart.js
  if (window.myBudgetChart) {
    window.myBudgetChart.destroy(); // Destroy old chart instance if it exists
  }
  window.myBudgetChart = new Chart(budgetChart, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], // Example labels
      datasets: [{
        label: 'Monthly Spending',
        data: budgetData,
        backgroundColor: currentTheme === 'dark' ? '#3a86ff' : 'var(--primary-color)',
        borderColor: currentTheme === 'dark' ? '#3a86ff' : 'var(--primary-color)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: currentTheme === 'dark' ? '#333' : '#eee' // Adjust grid color
          },
          ticks: {
            color: currentTheme === 'dark' ? '#eee' : '#222' // Adjust tick color
          }
        },
        x: {
          grid: {
            color: currentTheme === 'dark' ? '#333' : '#eee' // Adjust grid color
          },
          ticks: {
            color: currentTheme === 'dark' ? '#eee' : '#222' // Adjust tick color
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: currentTheme === 'dark' ? '#eee' : '#222' // Adjust legend text color
          }
        }
      }
    }
  });
  // This is a static overview, you'd need more logic for dynamic calculation
  budgetOverview.textContent = `Current spending trend based on last 6 months.`;
}

// =================
// Gamification
// =================

function addPoints(amount) {
  points += amount;
  localStorage.setItem(STORAGE_KEYS.POINTS, points);
}

function checkAndUpdateStreak() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (lastCompletionDate === today) {
    // Task completed multiple times today, streak doesn't increase
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  if (lastCompletionDate === yesterdayISO) {
    streak += 1;
    jarvisReply.textContent = `Streak! You're on a ${streak}-day streak!`;
  } else {
    // If not yesterday and not today, reset streak
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
  // Add more badge conditions here
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
  recognitionInstance.continuous = false; // Listen for a single utterance
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
      response = "I can help you manage tasks, take notes, provide budget overview, and track your productivity.";
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
        completeTask(taskToComplete.id); // This already updates UI and saves
        return; // Exit to prevent generic response
      } else {
        response = "I couldn't find that task or it's already completed.";
      }
    } else if (command.includes("list my notes")) {
      if (notes.length > 0) {
        response = "Your notes are: " + notes.join("; ") + ".";
      } else {
        response = "You have no notes.";
      }
    } else if (command.includes("check my budget")) {
      response = "Your budget overview shows a spending trend over the last six months.";
    } else if (command.includes("how am i doing")) {
      response = `You have ${points} points and a ${streak}-day streak. Keep up the good work!`;
    } else if (command.includes("add task")) {
      // Example: "hey jarvis add task buy groceries due tomorrow"
      // More robust parsing for due dates would be needed
      const taskMatch = command.match(/add task (.+?)(?: due (.+))?$/);
      if (taskMatch && taskMatch[1]) {
        const taskText = taskMatch[1].trim();
        const dueDate = taskMatch[2] ? taskMatch[2].trim() : ''; // Basic due date capture
        addTask(taskText, dueDate);
        return; // Exit to prevent generic response
      } else {
        response = "Please specify the task to add, for example: 'add task buy groceries'.";
      }
    } else if (command.includes("add note")) {
      // Example: "hey jarvis add note remember to call mom"
      const noteMatch = command.match(/add note (.+)/);
      if (noteMatch && noteMatch[1]) {
        const noteText = noteMatch[1].trim();
        addNote(noteText);
        return; // Exit to prevent generic response
      } else {
        response = "Please specify the note to add, for example: 'add note remember to call mom'.";
      }
    }
    else {
      response = "Hello. How can I assist you?";
    }
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
  renderBudgetChart(); // Re-render chart to update colors
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
  if (recognition) { // Only start if recognition is initialized
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

// Event listeners for new Add Task/Note buttons
if (addTaskBtn) {
  addTaskBtn.addEventListener("click", () => {
    addTask(newTaskInput.value, newTaskDueDate.value);
    newTaskInput.value = ""; // Clear input
    newTaskDueDate.value = ""; // Clear due date input
  });
}

if (addNoteBtn) {
  addNoteBtn.addEventListener("click", () => {
    addNote(newNoteInput.value);
    newNoteInput.value = ""; // Clear input
  });
}


// On load
renderTasks();
renderNotes();
updateGamificationUI();
loadTheme();
renderBudgetChart();