app.js
const startBtn = document.getElementById('startBtn');
const userSpeech = document.getElementById('userSpeech');
const jarvisReply = document.getElementById('jarvisReply');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

startBtn.addEventListener('click', () => {
  jarvisReply.textContent = 'Listening...';
  recognition.start();
});

recognition.onresult = function (event) {
  const speech = event.results[0][0].transcript;
  userSpeech.textContent = speech;
  processCommand(speech);
};

function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = synth.getVoices().find(voice => voice.name.includes("Daniel") || voice.name.includes("UK")) || synth.getVoices()[0];
  utterance.pitch = 1;
  utterance.rate = 1;
  synth.speak(utterance);
}

function processCommand(command) {
  command = command.toLowerCase();

  if (command.includes("hey jarvis")) {
    const actualCommand = command.replace("hey jarvis", "").trim();
    let response = "Sorry, I didn't understand that.";

    if (actualCommand.includes("hello") || actualCommand.includes("hi")) {
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
};
