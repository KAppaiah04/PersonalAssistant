// ===================================
// Jarvis Personal AI Assistant - App Logic
// ===================================

// --- DOM Element References ---
const startBtn = document.getElementById("startBtn");
const userSpeech = document.getElementById("userSpeech");
const jarvisReply = document.getElementById("jarvisReply");
const taskList = document.getElementById("taskList");
const notesList = document.getElementById("notesList");
const budgetChartCanvas = document.getElementById("budgetChart");
const budgetSummaryText = document.getElementById("budgetSummaryText"); // New element
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

// Empty state messages (new)
const noTasksMessage = document.getElementById("noTasksMessage");
const noNotesMessage = document.getElementById("noNotesMessage");
const noBadgesMessage = document.getElementById("noBadgesMessage");


// --- Global Variables ---
let recognition; // Speech recognition object
let listening = false;
let currentTheme = 'light'; // Default theme

// --- Data Storage (using localStorage for persistence) ---
const STORAGE_KEYS = {
    TASKS: "jarvis_tasks",
    NOTES: "jarvis_notes",
    BUDGET_DATA: "jarvis_budget_data",
    STREAK: "jarvis_streak",
    LAST_COMPLETION_DATE: "jarvis_last_date",
    POINTS: "jarvis_points",
    BADGES: "jarvis_badges",
    THEME: "jarvis_theme",
};

// Initialize data from localStorage or set defaults
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS)) || []; // Start with empty if no data
let notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || []; // Start with empty if no data
let budgetData = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGET_DATA)) || []; // Empty for dynamic data
let streak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
let lastCompletionDate = localStorage.getItem(STORAGE_KEYS.LAST_COMPLETION_DATE);
let points = parseInt(localStorage.getItem(STORAGE_KEYS.POINTS)) || 0;
let badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES)) || [];

// --- Utility Functions ---

// Saves all current data to localStorage
function saveData() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    localStorage.setItem(STORAGE_KEYS.BUDGET_DATA, JSON.stringify(budgetData));
    localStorage.setItem(STORAGE_KEYS.STREAK, streak);
    localStorage.setItem(STORAGE_KEYS.LAST_COMPLETION_DATE, lastCompletionDate);
    localStorage.setItem(STORAGE_KEYS.POINTS, points);
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

// --- Gamification Logic ---

// Updates the gamification display elements
function updateGamificationUI() {
    streakCountEl.textContent = streak;
    pointsCountEl.textContent = points;

    badgesEl.innerHTML = ''; // Clear existing badges
    if (badges.length === 0) {
        noBadgesMessage.style.display = 'block'; // Show empty state
    } else {
        noBadgesMessage.style.display = 'none'; // Hide empty state
        badges.forEach(badge => {
            const badgeEl = document.createElement("span");
            badgeEl.classList.add("badge");
            badgeEl.textContent = badge;
            badgesEl.appendChild(badgeEl);
        });
    }
}

// Checks and updates the daily streak based on task completion
function checkAndUpdateStreak() {
    const today = new Date().toDateString();

    if (!lastCompletionDate) {
        streak = 1; // First completion ever
    } else {
        const lastDate = new Date(lastCompletionDate);
        const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            streak++;
        } else if (diffDays > 1) {
            streak = 1; // Streak broken, reset
        }
    }
    lastCompletionDate = today;
    saveData();
    updateGamificationUI();
}

// Adds points and checks for new badges
function addPoints(value) {
    points += value;
    checkBadges(); // Check if new badges are earned
    saveData();
    updateGamificationUI();
}

// Defines badge conditions and awards them if met
function checkBadges() {
    if (points >= 50 && !badges.includes("Productivity Pro")) {
        badges.push("Productivity Pro");
        jarvisReply.textContent = "Congratulations! You've earned the 'Productivity Pro' badge!";
    }
    if (streak >= 5 && !badges.includes("5-Day Streak")) {
        badges.push("5-Day Streak");
        jarvisReply.textContent = "Awesome! You've earned the '5-Day Streak' badge!";
    }
    if (streak >= 10 && !badges.includes("10-Day Streak")) {
        badges.push("10-Day Streak");
        jarvis.Reply.textContent = "Incredible! You've earned the '10-Day Streak' badge!";
    }
    const completedTasksCount = tasks.filter(t => t.completed).length;
    if (tasks.length > 0 && completedTasksCount >= 3 && !badges.includes("Task Master")) {
        badges.push("Task Master");
        jarvisReply.textContent = "Well done! You've earned the 'Task Master' badge!";
    }
    // Add more badge conditions here as desired
}

// --- Data Management & Rendering ---

// Renders the task list in the UI
function renderTasks() {
    taskList.innerHTML = ""; // Clear existing tasks
    if (tasks.length === 0) {
        noTasksMessage.style.display = 'block'; // Show empty state
    } else {
        noTasksMessage.style.display = 'none'; // Hide empty state
        tasks.forEach(task => {
            const li = document.createElement("li");
            li.textContent = task.text;
            if (task.completed) {
                li.classList.add("completed");
                li.innerHTML += ' <span class="status-done">(Done)</span>';
            } else {
                li.classList.add("incomplete");
                li.title = "Click to mark complete";
                li.addEventListener("click", () => markTaskCompleted(task.id));
            }
            taskList.appendChild(li);
        });
    }
    saveData();
}

// Marks a task as completed and updates gamification
function markTaskCompleted(id) {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
        task.completed = true;
        addPoints(10);
        checkAndUpdateStreak();
        renderTasks();
        jarvisReply.textContent = `Great job! Task "${task.text}" marked as completed.`;
    }
}

// Renders the notes list in the UI
function renderNotes() {
    notesList.innerHTML = ""; // Clear existing notes
    if (notes.length === 0) {
        noNotesMessage.style.display = 'block'; // Show empty state
    } else {
        noNotesMessage.style.display = 'none'; // Hide empty state
        notes.forEach(note => {
            const li = document.createElement("li");
            li.textContent = note;
            notesList.appendChild(li);
        });
    }
    saveData();
}

// Renders the budget chart using Canvas API
function renderBudgetChart() {
    const ctx = budgetChartCanvas.getContext("2d");
    // Clear previous chart for re-drawing on theme change/data update
    ctx.clearRect(0, 0, budgetChartCanvas.width, budgetChartCanvas.height);

    // Basic bar chart logic
    if (budgetData.length === 0) {
        budgetSummaryText.textContent = "No budget data yet. Record some transactions!";
        // Optionally draw a placeholder or simply leave canvas clear
        return;
    }

    const maxBudget = Math.max(...budgetData, 1);
    const barWidth = 30;
    const gap = 15;
    const startX = 20;
    const baseY = budgetChartCanvas.height - 30; // Base line for bars, leaving space for labels

    // Get current theme colors for chart elements
    const bodyStyles = getComputedStyle(document.body);
    const barColor = bodyStyles.getPropertyValue('--color-primary-' + currentTheme).trim();
    const axisColor = bodyStyles.getPropertyValue('--color-text-' + currentTheme).trim();
    const textColor = bodyStyles.getPropertyValue('--color-text-' + currentTheme).trim();

    ctx.fillStyle = barColor;
    ctx.strokeStyle = axisColor;
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    budgetData.forEach((value, i) => {
        const barHeight = (value / maxBudget) * (budgetChartCanvas.height - 60); // Scale height
        const x = startX + i * (barWidth + gap);
        const y = baseY - barHeight;

        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw value on top of bar
        ctx.fillStyle = textColor;
        ctx.fillText(`$${value}`, x + barWidth / 2, y - 5);
        ctx.fillStyle = barColor; // Reset fill for bars
    });

    // Draw X-axis
    ctx.beginPath();
    ctx.moveTo(startX - 5, baseY);
    ctx.lineTo(budgetChartCanvas.width - 10, baseY);
    ctx.stroke();

    // Update summary text
    const totalTransactions = budgetData.length;
    const totalAmount = budgetData.reduce((sum, val) => sum + val, 0);
    budgetSummaryText.textContent = `Recorded ${totalTransactions} transactions totaling $${totalAmount.toFixed(2)}.`;
    saveData();
}

// --- Theme Management ---

// Sets the application theme
function setTheme(theme) {
    document.body.className = theme; // Apply theme class to body
    currentTheme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme); // Save theme preference
    renderBudgetChart(); // Re-render chart to update colors
}

// Loads the saved theme on startup
function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "light"; // Default to light
    setTheme(savedTheme);
    themeSelect.value = savedTheme; // Set dropdown to current theme
}

// --- Speech Recognition ---

// Initializes the Web Speech API recognition
function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) {
        userSpeech.textContent = "Speech Recognition not supported in this browser.";
        startBtn.disabled = true; // Disable button if not supported
        jarvisReply.textContent = "Voice commands are not available.";
        return null;
    }

    const newRecognition = new window.SpeechRecognition();
    newRecognition.continuous = false; // Listen for a single phrase, then stop
    newRecognition.interimResults = false; // Only return final results
    newRecognition.lang = "en-US"; // Set language

    newRecognition.onstart = () => {
        listening = true;
        startBtn.textContent = "Listening...";
        startBtn.classList.add("listening");
        userSpeech.textContent = "Listening... Speak now.";
        jarvisReply.textContent = "Awaiting your command.";
    };

    newRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript; // Get final transcript
        userSpeech.textContent = `You said: "${transcript}"`;
        handleVoiceCommand(transcript.toLowerCase()); // Process the command
    };

    newRecognition.onend = () => {
        listening = false;
        startBtn.textContent = "Activate Jarvis";
        startBtn.classList.remove("listening");
        if (jarvisReply.textContent === "Awaiting your command." || jarvisReply.textContent === "Please speak your command.") {
            jarvisReply.textContent = "Waiting for command..."; // Reset if no command was given or recognized
        }
    };

    newRecognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        userSpeech.textContent = `Error: ${event.error}`;
        jarvisReply.textContent = "Sorry, I didn't catch that or an error occurred.";
        listening = false;
        startBtn.textContent = "Activate Jarvis";
        startBtn.classList.remove("listening");
    };
    return newRecognition;
}

// Handles voice commands from the user
function handleVoiceCommand(command) {
    let response = "";

    // Check if the command starts with the wake phrase
    if (command.startsWith("hey jarvis") || command.startsWith("jarvis")) {
        const actualCommand = command.replace(/^(hey jarvis|jarvis)\s*/, "").trim();

        if (actualCommand.includes("time")) {
            const now = new Date();
            response = `The current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
        } else if (actualCommand.includes("date")) {
            const today = new Date();
            response = `Today's date is ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
        } else if (actualCommand.includes("list tasks")) {
            const incomplete = tasks.filter(t => !t.completed).map(t => t.text);
            response = incomplete.length ? `You have ${incomplete.length} incomplete tasks: ${incomplete.join(", ")}.` : "All tasks are complete. You're doing great!";
        } else if (actualCommand.includes("add task")) {
            const taskText = actualCommand.split("add task")[1].trim();
            if (taskText) {
                // Ensure unique ID for new tasks
                const newId = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
                tasks.push({ id: newId, text: taskText, completed: false, dueDate: "Not set" });
                renderTasks();
                response = `Task "${taskText}" added to your list.`;
            } else {
                response = "What task would you like me to add?";
            }
        } else if (actualCommand.includes("complete task") || actualCommand.includes("mark task as done")) {
            const taskQuery = actualCommand.replace(/complete task|mark task as done/, "").trim();
            const foundTask = tasks.find(t => t.text.toLowerCase().includes(taskQuery) && !t.completed);
            if (foundTask) {
                markTaskCompleted(foundTask.id);
                response = `Marked "${foundTask.text}" as completed. Excellent work!`;
            } else {
                response = "I couldn't find an incomplete task matching that. Please be more specific.";
            }
        } else if (actualCommand.includes("add note")) {
            const noteText = actualCommand.split("add note")[1].trim();
            if (noteText) {
                notes.push(noteText);
                renderNotes();
                response = `Note "${noteText}" has been saved.`;
            } else {
                response = "What note would you like me to add?";
            }
        } else if (actualCommand.includes("record expense") || actualCommand.includes("add budget")) {
            const amountMatch = actualCommand.match(/\d+(\.\d+)?/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[0]);
                budgetData.push(amount);
                renderBudgetChart();
                response = `Recorded $${amount.toFixed(2)} to your budget.`;
            } else {
                response = "How much would you like to record?";
            }
        } else if (actualCommand.includes("change theme to")) {
            const themeName = actualCommand.split("change theme to")[1].trim();
            if (["light", "dark", "vibrant"].includes(themeName)) {
                setTheme(themeName);
                response = `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme activated.`;
            } else {
                response = "I can switch to light, dark, or vibrant themes. Which one would you like?";
            }
        } else if (actualCommand.includes("how many points do i have") || actualCommand.includes("my points")) {
            response = `You currently have ${points} productivity points.`;
        } else if (actualCommand.includes("what is my streak") || actualCommand.includes("my streak")) {
            response = `Your current streak is ${streak} day${streak === 1 ? "" : "s"}.`;
        } else if (actualCommand.includes("thank you") || actualCommand.includes("thanks jarvis")) {
            response = "You're most welcome. Happy to assist.";
        } else if (actualCommand === "") {
            response = "Yes? How may I help you?";
        } else {
            response = "I'm still learning and don't understand that command yet. Try something like 'Add task buy milk' or 'What's the time?'.";
        }
    } else {
        response = "Please start your command with 'Hey Jarvis'.";
    }
    jarvisReply.textContent = response;
}


// --- Event Listeners ---

// Start/Stop Speech Recognition
startBtn.addEventListener("click", () => {
    if (!recognition) {
        recognition = initSpeechRecognition();
    }
    if (listening) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

// Theme Selector
themeSelect.addEventListener("change", (e) => {
    setTheme(e.target.value);
});

// Manual Input Buttons
addTaskBtn.addEventListener("click", () => {
    const taskText = taskInput.value.trim();
    if (taskText) {
        const newId = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
        tasks.push({ id: newId, text: taskText, completed: false, dueDate: "Not set" });
        renderTasks();
        taskInput.value = "";
        jarvisReply.textContent = `Task "${taskText}" added manually.`;
    } else {
        jarvisReply.textContent = "Please enter a task description.";
    }
});

addNoteBtn.addEventListener("click", () => {
    const noteText = noteInput.value.trim();
    if (noteText) {
        notes.push(noteText);
        renderNotes();
        noteInput.value = "";
        jarvisReply.textContent = `Note "${noteText}" added manually.`;
    } else {
        jarvisReply.textContent = "Please enter some text for your note.";
    }
});

addBudgetBtn.addEventListener("click", () => {
    const budgetValue = parseFloat(budgetInput.value);
    if (!isNaN(budgetValue) && budgetValue !== 0) {
        budgetData.push(budgetValue);
        renderBudgetChart();
        budgetInput.value = "";
        jarvisReply.textContent = `Recorded $${budgetValue.toFixed(2)} manually.`;
    } else {
        jarvisReply.textContent = "Please enter a valid number for your transaction.";
    }
});


// --- Initialization on Page Load ---
document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    renderTasks();
    renderNotes();
    renderBudgetChart();
    updateGamificationUI();
    recognition = initSpeechRecognition(); // Initialize speech recognition
    jarvisReply.textContent = "Hello! I'm Jarvis, your personal AI assistant. Say 'Activate Jarvis' to begin.";
});