// app.js

// ----------- Data and localStorage Setup ------------

let tasks = JSON.parse(localStorage.getItem("tasks")) || [
  { id: 1, text: "Call Mom", due: "2025-06-20", priority: "High", recurring: false, completed: false },
  { id: 2, text: "Submit budget report", due: "2025-06-22", priority: "Medium", recurring: true, completed: false }
];

let budget = JSON.parse(localStorage.getItem("budget")) || {
  income: 5000,
  expenses: [
    { category: "Rent", amount: 1200 },
    { category: "Groceries", amount: 450 },
    { category: "Utilities", amount: 300 }
  ],
  monthlyGoal: 4000
};

let notes = JSON.parse(localStorage.getItem("notes")) || [
  { id: 1, text: "AI project progress: model training done", tags: ["AI", "project"], date: "2025-06-15" },
  { id: 2, text: "Meeting notes with client", tags: ["meeting"], date: "2025-06-16" }
];

let dailyRecommendations = [
  "Start with tasks closest to deadline",
  "Remember to take short breaks every hour",
  "Review your budget weekly",
  "Keep notes organized with tags"
];

// ----------- UI References ------------

const userSpeechEl = document.getElementById("userSpeech");
const jarvisReplyEl = document.getElementById("jarvisReply");
const startBtn = document.getElementById("startBtn");
const taskListEl = document.getElementById("taskList");
const notesListEl = document.getElementById("notesList");
const budgetSummaryEl = document.getElementById("budgetSummary");
const dailyRecommendationEl = document.getElementById("dailyRecommendation");
const budgetChartCtx = document.getElementById("budgetChart").getContext("2d");

let recognition, isListening = false;
let synth = window.speechSynthesis;

// ----------- Functions ------------

// Save all data to localStorage
function saveAll() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("budget", JSON.stringify(budget));
  localStorage.setItem("notes", JSON.stringify(notes));
}

// Speak function
function speak(text) {
  if (synth.speaking) {
    synth.cancel();
  }
  const utterThis = new SpeechSynthesisUtterance(text);
  utterThis.rate = 1.1;
  synth.speak(utterThis);
  jarvisReplyEl.textContent = text;
}

// Render upcoming tasks
function renderTasks() {
  taskListEl.innerHTML = "";
  let upcoming = tasks.filter(t => !t.completed).sort((a,b) => new Date(a.due) - new Date(b.due));
  if(upcoming.length === 0) {
    taskListEl.innerHTML = "<li>No upcoming tasks!</li>";
    return;
  }
  upcoming.forEach(task => {
    const li = document.createElement("li");
    li.textContent = `${task.text} - Due: ${task.due} - Priority: ${task.priority}`;
    taskListEl.appendChild(li);
  });
}

// Render recent notes
function renderNotes() {
  notesListEl.innerHTML = "";
  if(notes.length === 0) {
    notesListEl.innerHTML = "<li>No recent notes</li>";
    return;
  }
  // Show last 5 notes sorted by date desc
  let sortedNotes = notes.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
  sortedNotes.forEach(note => {
    const li = document.createElement("li");
    li.textContent = note.text;
    notesListEl.appendChild(li);
  });
}

// Render budget chart & summary
function renderBudget() {
  let totalExpenses = budget.expenses.reduce((acc, e) => acc + e.amount, 0);
  let remaining = budget.income - totalExpenses;
  budgetSummaryEl.textContent = `Income: $${budget.income.toFixed(2)}, Expenses: $${totalExpenses.toFixed(2)}, Remaining: $${remaining.toFixed(2)} (Goal: $${budget.monthlyGoal})`;

  // Clear canvas before redraw
  budgetChartCtx.clearRect(0, 0, 300, 150);

  // Draw simple bar chart
  const barWidth = 40;
  const maxHeight = 100;
  const startX = 40;
  const startY = 130;

  // Draw Income Bar
  budgetChartCtx.fillStyle = "#4caf50";
  let incomeHeight = (budget.income / (budget.income + totalExpenses)) * maxHeight;
  budgetChartCtx.fillRect(startX, startY - incomeHeight, barWidth, incomeHeight);
  budgetChartCtx.fillStyle = "#000";
  budgetChartCtx.fillText("Income", startX, startY + 15);

  // Draw Expenses Bar
  budgetChartCtx.fillStyle = "#f44336";
  let expenseHeight = (totalExpenses / (budget.income + totalExpenses)) * maxHeight;
  budgetChartCtx.fillRect(startX + 80, startY - expenseHeight, barWidth, expenseHeight);
  budgetChartCtx.fillStyle = "#000";
  budgetChartCtx.fillText("Expenses", startX + 80, startY + 15);
}

// Provide a daily recommendation randomly
function updateDailyRecommendation() {
  let index = Math.floor(Math.random() * dailyRecommendations.length);
  dailyRecommendationEl.textContent = dailyRecommendations[index];
}

// Smart priority suggestion (simple version)
function suggestPriority(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due - today) / (1000 * 3600 * 24));
  if(diffDays <= 1) return "High";
  if(diffDays <= 5) return "Medium";
  return "Low";
}

// Handle commands
function handleCommand(command) {
  const lower = command.toLowerCase();

  if(lower.includes("upcoming task")) {
    if(tasks.length === 0) {
      speak("You have no tasks at the moment.");
    } else {
      let nextTask = tasks.filter(t => !t.completed).sort((a,b) => new Date(a.due) - new Date(b.due))[0];
      if(nextTask) {
        speak(`Your next task is to ${nextTask.text} due on ${nextTask.due}.`);
      } else {
        speak("You have no upcoming tasks.");
      }
    }
  }
  else if(lower.includes("add reminder") || lower.includes("remind me to")) {
    // Example: "Remind me to call mom on saturday"
    let reminderText = command.match(/remind me to (.+)/i);
    if(reminderText && reminderText[1]) {
      let reminder = reminderText[1].trim();

      // Extract date (simple parser for "on saturday" etc)
      let dueDate = new Date();
      // If "on <day>" exists, parse it:
      let dayMatch = reminder.match(/on (\w+)/i);
      if(dayMatch && dayMatch[1]) {
        let dayName = dayMatch[1].toLowerCase();
        const daysOfWeek = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
        let todayIndex = dueDate.getDay();
        let targetIndex = daysOfWeek.indexOf(dayName);
        if(targetIndex >=0) {
          let diff = (targetIndex - todayIndex + 7) % 7;
          if(diff === 0) diff = 7; // next week
          dueDate.setDate(dueDate.getDate() + diff);
        }
      }
      // Remove "on <day>" from reminder text for task description
      reminder = reminder.replace(/on \w+/i, '').trim();

      // Suggest priority based on due date
      let priority = suggestPriority(dueDate.toISOString().slice(0,10));

      // Add to tasks
      let newTask = {
        id: Date.now(),
        text: reminder,
        due: dueDate.toISOString().slice(0,10),
        priority,
        recurring: false,
        completed: false
      };
      tasks.push(newTask);
      saveAll();
      renderTasks();
      speak(`Reminder added: ${newTask.text} on ${newTask.due} with priority ${newTask.priority}`);
    } else {
      speak("Please specify what you want me to remind you about.");
    }
  }
  else if(lower.includes("what's the budget") || lower.includes("budget overview")) {
    let totalExpenses = budget.expenses.reduce((acc, e) => acc + e.amount, 0);
    let remaining = budget.income - totalExpenses;
    speak(`Your income is $${budget.income.toFixed(2)}. Your expenses total $${totalExpenses.toFixed(2)}. Remaining budget is $${remaining.toFixed(2)}.`);
  }
  else if(lower.includes("notes") || lower.includes("recent notes")) {
    if(notes.length === 0) {
      speak("You have no recent notes.");
    } else {
      let latestNote = notes.slice().sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      speak(`Your latest note says: ${latestNote.text}`);
    }
  }
  else if(lower.includes("daily recommendation")) {
    updateDailyRecommendation();
    speak(dailyRecommendationEl.textContent);
  }
  else if(lower.includes("thank you") || lower.includes("thanks")) {
    speak("You're welcome! Let me know if you need anything else.");
  }
  else if(lower.includes("stop listening") || lower.includes("deactivate")) {
    speak("Deactivating Jarvis. Talk to you later!");
    stopRecognition();
  }
  else {
    speak("Sorry, I didn't catch that. Please try again.");
  }
}

// Initialize Speech Recognition
function initRecognition() {
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("Speech Recognition API not supported in this browser.");
    startBtn.disabled = true;
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    startBtn.textContent = "Deactivate Jarvis";
    jarvisReplyEl.textContent = "Listening for 'Hey Jarvis'...";
  };

  recognition.onend = () => {
    isListening = false;
    startBtn.textContent = "Activate Jarvis";
    jarvisReplyEl.textContent = "Jarvis stopped listening.";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for(let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    userSpeechEl.textContent = transcript;

    // Only respond if "hey jarvis" is said first
    if(transcript.toLowerCase().includes("hey jarvis")) {
      // Extract command after "hey jarvis"
      let cmdIndex = transcript.toLowerCase().indexOf("hey jarvis") + 9;
      let command = transcript.slice(cmdIndex).trim();
      if(command.length === 0) {
        speak("Yes? How can I assist you?");
      } else {
        handleCommand(command);
      }
    }
  };
}

function startRecognition() {
  if(!recognition) {
    initRecognition();
  }
  recognition.start();
}

function stopRecognition() {
  if(recognition && isListening) {
    recognition.stop();
  }
}

// ----------- Initialization ------------

startBtn.addEventListener("click", () => {
  if(isListening) {
    stopRecognition();
  } else {
    startRecognition();
  }
});

renderTasks();
renderNotes();
renderBudget();
updateDailyRecommendation();
