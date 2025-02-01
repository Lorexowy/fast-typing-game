// main.js
const socket = io();

// Ekrany
const pageIntro = document.getElementById('pageIntro');
const pageNickname = document.getElementById('pageNickname');
const pageJoin = document.getElementById('pageJoin');
const pageLobby = document.getElementById('pageLobby');
const pageGame = document.getElementById('pageGame');

// Elementy UI
const createGameBtn = document.getElementById('createGameBtn');
const goToJoinBtn = document.getElementById('goToJoinBtn');
const confirmNicknameBtn = document.getElementById('confirmNicknameBtn');
const confirmJoinBtn = document.getElementById('confirmJoinBtn');

const nicknameInput = document.getElementById('nicknameInput');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinNicknameInput = document.getElementById('joinNicknameInput');

const readyBtn = document.getElementById('readyBtn');
const startGameBtn = document.getElementById('startGameBtn');
const regenerateCodeBtn = document.getElementById('regenerateCodeBtn');

const countdownContainer = document.getElementById('countdownContainer');
const countdownNumber = document.getElementById('countdownNumber');
const countdownBarProgress = document.getElementById('countdownBarProgress');

const typedTextEl = document.getElementById('typedText');

const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const hostStatusEl = document.getElementById('hostStatus');
const playerStatusEl = document.getElementById('playerStatus');

const winnerEl = document.getElementById('winner');
const infoEl = document.getElementById('info');
const textToTypeEl = document.getElementById('textToType');
const opponentProgressEl = document.getElementById('opponentProgress');
const returnToMenuBtn = document.getElementById('returnToMenuBtn');

const themeSwitch = document.getElementById('themeSwitch');
const themeText = document.getElementById('themeText');

const giveUpBtn = document.getElementById('giveUpBtn');
const difficultySelect = document.getElementById('difficultySelect');

// Nowe: element wyświetlający czas pisania
const finalTimeEl = document.getElementById('finalTime');

// Stan gry
let currentGameCode = null;
let isHost = false;
let originalText = "";
let typedLength = 0;
let gameEnded = false;

// Ustawiamy domyślne wartości nickname'ów
let hostNickname = "Host";
let playerNickname = "Gracz";

// Zmienna do pomiaru czasu
let startTime = null;

function showPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  infoEl.innerText = "";
}

// Powrót do menu
returnToMenuBtn.addEventListener('click', () => {
  gameEnded = false;
  giveUpBtn.disabled = false;
  currentGameCode = null;
  showPage('pageIntro');
});

// Ekran startowy
createGameBtn.addEventListener('click', () => {
  isHost = true;
  showPage('pageNickname');
});
goToJoinBtn.addEventListener('click', () => {
  isHost = false;
  showPage('pageJoin');
});

// Host wpisuje nick, tworzy grę
confirmNicknameBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    alert('Wpisz swój nick.');
    return;
  }
  hostNickname = nickname; // aktualizujemy nick hosta
  socket.emit('createGame', nickname);
});

// Gracz dołącza
confirmJoinBtn.addEventListener('click', () => {
  const code = joinCodeInput.value.trim();
  const nick = joinNicknameInput.value.trim();
  if (!code || !nick) {
    alert('Wpisz kod i nick.');
    return;
  }
  playerNickname = nick; // aktualizujemy nick gracza
  socket.emit('joinGame', { gameCode: code, nickname: nick });
});

// gameCreated - wysyłane do hosta po utworzeniu gry
socket.on('gameCreated', (gameCode) => {
  currentGameCode = gameCode;
  showPage('pageLobby');
  // Używamy tłumaczenia dla etykiety kodu gry
  gameCodeDisplay.innerText = `${translations[currentLang].gameCodeLabel} ${gameCode}`;
  if (isHost) {
    regenerateCodeBtn.classList.remove('hidden');
    document.getElementById('hostModifications').classList.remove('hidden');
  }
  updateReadyDisplay(false, false);
});

// joinedGame - wysyłane do gracza po dołączeniu do gry; dodatkowo przekazujemy hostNickname
socket.on('joinedGame', (data) => {
  currentGameCode = data.gameCode;
  // Ustawiamy hostNickname na podstawie danych od serwera
  hostNickname = data.hostNickname;
  showPage('pageLobby');
  gameCodeDisplay.innerText = `${translations[currentLang].gameCodeLabel} ${data.gameCode}`;
  regenerateCodeBtn.classList.add('hidden');
  document.getElementById('hostModifications').classList.add('hidden');
  updateReadyDisplay(false, false);
});

// Ktoś dołączył (host widzi)
socket.on('playerJoined', (nickname) => {
  playerNickname = nickname;
  if(currentLang === 'pl'){
    infoEl.innerText = `Gracz ${nickname} dołączył do gry.`;
  } else {
    infoEl.innerText = `Player ${nickname} joined the game.`;
  }
  updateReadyDisplay(false, false);
});

// Funkcja aktualizująca status gotowości z wykorzystaniem nickname'ów
function updateReadyDisplay(hostReady, playerReady) {
  hostStatusEl.innerHTML = `${hostNickname}: <span class="${hostReady ? 'ready-label' : 'not-ready-label'}">
    ${hostReady ? translations[currentLang].ready : translations[currentLang].notReady}
  </span>`;
  
  playerStatusEl.innerHTML = `${playerNickname}: <span class="${playerReady ? 'ready-label' : 'not-ready-label'}">
    ${playerReady ? translations[currentLang].ready : translations[currentLang].notReady}
  </span>`;
}

// Regeneracja kodu
regenerateCodeBtn.addEventListener('click', () => {
  socket.emit('regenerateCode');
});

socket.on('codeRegenerated', (newCode) => {
  currentGameCode = newCode;
  gameCodeDisplay.innerText = `${translations[currentLang].newGameCodeLabel} ${newCode}`;
  infoEl.innerText = translations[currentLang].newGameGenerated;
  updateReadyDisplay(false, false);
});

// Kliknięcie "Gotowy"
readyBtn.addEventListener('click', () => {
  if (!currentGameCode) return;
  socket.emit('playerReady', currentGameCode);
});

// Serwer wysyła aktualny status
socket.on('updateReadyStatus', ({ hostReady, playerReady }) => {
  updateReadyDisplay(hostReady, playerReady);
  if (isHost && hostReady && playerReady) {
    startGameBtn.classList.remove('hidden');
  } else {
    startGameBtn.classList.add('hidden');
  }
});

// Host startuje => serwer odlicza
startGameBtn.addEventListener('click', () => {
  if (!currentGameCode) return;
  const difficulty = difficultySelect.value;
  socket.emit('startGame', { gameCode: currentGameCode, difficulty });
});

// Otrzymujemy countdown
socket.on('countdown', (time) => {
  countdownContainer.classList.remove('hidden');
  countdownNumber.textContent = time;
  let percent = (time / 5) * 100;
  if (percent < 0) percent = 0;
  countdownBarProgress.style.width = `${percent}%`;
});

// Gra się faktycznie rozpoczyna
socket.on('gameStarted', (text) => {
  countdownContainer.classList.add('hidden');
  countdownNumber.textContent = "5";
  countdownBarProgress.style.width = "100%";
  originalText = text;
  typedLength = 0;
  showPage('pageGame');
  textToTypeEl.innerHTML = "";
  updateDisplayedText();
  typedTextEl.value = "";
  typedTextEl.focus();
  winnerEl.innerText = "";
  opponentProgressEl.innerHTML = "";
  returnToMenuBtn.classList.add('hidden');
  finalTimeEl.innerText = "";
  startTime = Date.now();
});

// Funkcja do przesuwania tekstu
function updateDisplayedText() {
  const containerWidth = textToTypeEl.parentElement.offsetWidth;
  const middlePosition = containerWidth / 2;
  const typedPart = originalText.substring(0, typedLength);
  const currentChar = originalText[typedLength] || '';
  const remainingPart = originalText.substring(typedLength + 1);
  textToTypeEl.innerHTML = `
    <span style="color: green">${typedPart}</span><span class="current-char">${currentChar}</span><span>${remainingPart}</span>
  `;
  const currentCharEl = textToTypeEl.querySelector('.current-char');
  if (currentCharEl) {
    const charLeft = currentCharEl.offsetLeft;
    const charWidth = currentCharEl.offsetWidth;
    const targetPosition = middlePosition - (charLeft + charWidth/2);
    textToTypeEl.style.transform = `translateX(${targetPosition}px)`;
  }
  if (typedLength === 0) {
    textToTypeEl.style.transform = `translateX(0)`;
  }
}

// Podczas pisania
typedTextEl.addEventListener('input', () => {
  const value = typedTextEl.value;
  socket.emit('typedText', { gameCode: currentGameCode, typedText: value });
  setTimeout(() => updateDisplayedText(), 0);
});

// Błąd w pisaniu – podświetlanie pola i tekstu na czerwono
socket.on('typingError', () => {
  typedTextEl.value = "";
  typedTextEl.classList.add('flash-error');
  textToTypeEl.classList.add('flash-error-text');
  setTimeout(() => {
    typedTextEl.classList.remove('flash-error');
    textToTypeEl.classList.remove('flash-error-text');
  }, 500);
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), 300);
});

// Nasz postęp
socket.on('yourProgress', ({ correctCount }) => {
  typedLength = correctCount;
  updateDisplayedText();
});

// Koniec gry
socket.on('gameFinished', (data) => {
  let winnerSocketId, surrendered = false;
  if (typeof data === 'object' && data !== null) {
    winnerSocketId = data.winnerSocketId;
    surrendered = data.surrendered;
  } else {
    winnerSocketId = data;
  }
  const endTime = Date.now();
  const totalSeconds = ((endTime - startTime) / 1000).toFixed(2);
  if (winnerSocketId === socket.id) {
    winnerEl.innerText = surrendered ? "Gratulacje! Wygrałeś, przeciwnik się poddał!" : "Gratulacje! Wygrałeś!";
    finalTimeEl.innerText = `Twój czas: ${totalSeconds} s`;
  } else {
    winnerEl.innerText = surrendered ? "Niestety, przegrywasz poprzez poddanie." : "Niestety, przegrywasz wyścig.";
    finalTimeEl.innerText = `Twój czas: ${totalSeconds} s`;
  }
  returnToMenuBtn.classList.remove('hidden');
  gameEnded = true;
  giveUpBtn.disabled = true;
});

// Postęp przeciwnika
socket.on('opponentProgress', ({ typedLength: oppLen }) => {
  const total = originalText.length;
  const percent = Math.floor((oppLen / total) * 100);
  opponentProgressEl.innerHTML = `
    <div class="progress-bar" style="width: ${percent}%;"></div>
    <span style="margin-left: 8px;">${percent}%</span>
  `;
});

// Host regeneruje kod -> stara gra nie istnieje
socket.on('hostLeft', () => {
  showPage('pageIntro');
  infoEl.innerText = "Host zakończył grę. Możesz dołączyć do innej gry lub stworzyć własną.";
});

// Błędy
socket.on('errorMsg', (msg) => {
  infoEl.innerText = msg;
});

// Sprawdzenie, czy użytkownik miał wcześniej włączony tryb ciemny
if (localStorage.getItem('darkMode') === 'enabled') {
  document.body.classList.add('dark-mode');
  themeSwitch.checked = true;
  themeText.textContent = "Tryb jasny";
}

// Obsługa przełącznika trybu ciemnego
themeSwitch.addEventListener('change', () => {
  if (themeSwitch.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
      themeText.textContent = translations[currentLang].switchToLight;
  } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
      themeText.textContent = translations[currentLang].switchToDark;
  }
});

// Zablokowanie kopiowania (CTRL + C, klik prawym)
typedTextEl.addEventListener("copy", (e) => {
  e.preventDefault();
});

// Zablokowanie wklejania (CTRL + V, klik prawym)
typedTextEl.addEventListener("paste", (e) => {
  e.preventDefault();
});

// Obsługa kliknięcia przycisku "Poddaj się"
giveUpBtn.addEventListener('click', () => {
  if (!currentGameCode || gameEnded) {
    return;
  }
  socket.emit('giveUp', currentGameCode);
});

// Obsługa zmiany poziomu trudności
difficultySelect.addEventListener('change', () => {
  if (currentGameCode) {
    const newDifficulty = difficultySelect.value;
    socket.emit('updateDifficulty', { gameCode: currentGameCode, difficulty: newDifficulty });
  }
});

// Aktualizacja języka
function updateLanguage(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) {
      el.setAttribute('placeholder', translations[lang][key]);
    }
  });
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn && translations[lang] && translations[lang].langToggleBtn) {
    langToggleBtn.textContent = translations[lang].langToggleBtn;
  }
  localStorage.setItem('gameLang', lang);
}

let currentLang = localStorage.getItem('gameLang') || 'pl';
updateLanguage(currentLang);

const langToggleBtn = document.getElementById('langToggleBtn');
langToggleBtn.addEventListener('click', () => {
  currentLang = (currentLang === 'pl') ? 'en' : 'pl';
  updateLanguage(currentLang);
});
