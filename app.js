const startBtn = document.getElementById('startBtn');
const userSpeech = document.getElementById('userSpeech');
const jarvisReply = document.getElementById('jarvisReply');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
recognition.continuous = true;

let isListening = false;

startBtn.addEventListener('click', () => {
  if (!isListening) {
    jarvisReply.textContent = 'Listening...';
    recognition.start();
    isListening = true;
    startBtn.textContent = 'Deactivate Jarvis';
  } else {
    recognition.stop();
    isListening = false;
    jarvisReply.textContent = 'Jarvis has stopped listening.';
    startBtn.textContent = 'Activate Jarvis';
  }
});

recognition.onresult = function (event) {
  const speech = event.results[event.results.length - 1][0].transcript;
  userSpeech.textContent = speech;
  processCommand(speech);
};

function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = synth.getVoices().find(v => v.name.includes("Daniel") || v.name.includes("UK")) || synth.getVoices()[0];
  utterance.pitch = 1;
  utterance.rate = 1;
  synth.speak(utterance);
}

function processCommand(command) {
  command = command.toLowerCase();
  if (command.includes("hey jarvis")) {
    const actualCommand = command.replace("hey jarvis", "").trim();
    let response = "Sorry, I didn't understand that.";

    // Dashboard view summary
    if (actualCommand.includes("dashboard")) {
      response = `Here's your dashboard summary. You have 3 tasks today. You've used 60% of your budget. One note was updated yesterday.`;
    }

    // Task management
    else if (actualCommand.includes("task") || actualCommand.includes("tasks")) {
      if (actualCommand.includes("due")) {
        response = "You have a report to submit by 6 PM.";
      } else if (actualCommand.includes("complete") || actualCommand.includes("done")) {
        response = "Great! I've marked your top task as complete.";
      } else if (actualCommand.includes("priority")) {
        response = "Based on urgency, prioritize the budget report first.";
      } else if (actualCommand.includes("suggest")) {
        response = "You should start with tasks closest to deadline first.";
      } else {
        response = "You have 3 tasks scheduled for today.";
      }
    }

    // Budget tracking
    else if (actualCommand.includes("budget") || actualCommand.includes("expense")) {
      if (actualCommand.includes("status")) {
        response = "You've spent 60% of your budget this month.";
      } else if (actualCommand.includes("recommend")) {
        response = "Reduce your dining out expenses to meet your savings goal.";
      } else {
        response = "You added a grocery expense of $50 yesterday.";
      }
    }

    // Notes
    else if (actualCommand.includes("note")) {
      if (actualCommand.includes("search")) {
        response = "Found 2 notes related to 'budget planning'.";
      } else if (actualCommand.includes("template")) {
        response = "Opening note template: Project Summary.";
      } else if (actualCommand.includes("related")) {
        response = "You have 2 related notes on task automation.";
      } else {
        response = "Your last note was about AI project progress.";
      }
    }

    // Greetings and general
    else if (actualCommand.includes("hello") || actualCommand.includes("hi")) {
      response = "Hello! I'm Jarvis, your assistant.";
    } else if (actualCommand.includes("your name")) {
      response = "I am Jarvis, your voice assistant.";
    } else if (actualCommand.includes("time")) {
      const now = new Date();
      response = `The current time is ${now.getHours()}:${now.getMinutes()}`;
    } else if (actualCommand.includes("date")) {
      const now = new Date();
      response = `Today's date is ${now.toDateString()}`;
    }

    jarvisReply.textContent = response;
    speak(response);
  } else {
    jarvisReply.textContent = "Say 'Hey Jarvis' to activate me.";
  }
}

recognition.onerror = function (event) {
  jarvisReply.textContent = 'Error occurred in recognition: ' + event.error;
  isListening = false;
  startBtn.textContent = 'Activate Jarvis';
};

recognition.onend = function () {
  if (isListening) {
    recognition.start(); // Restart listening continuously
  }
};
