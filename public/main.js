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

// Nowe: element wyświetlający czas pisania
const finalTimeEl = document.getElementById('finalTime');

// Stan gry
let currentGameCode = null;
let isHost = false;
let originalText = "";
let typedLength = 0;

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
  socket.emit('joinGame', { gameCode: code, nickname: nick });
});

// gameCreated
socket.on('gameCreated', (gameCode) => {
  currentGameCode = gameCode;
  showPage('pageLobby');
  gameCodeDisplay.innerText = `Kod Twojej gry: ${gameCode}`;

  if (isHost) {
    regenerateCodeBtn.classList.remove('hidden');
    document.getElementById('hostModifications').classList.remove('hidden');
  }
  updateReadyDisplay(false, false);
});

// joinedGame
socket.on('joinedGame', (gameCode) => {
  currentGameCode = gameCode;
  showPage('pageLobby');
  gameCodeDisplay.innerText = `Dołączyłeś do gry o kodzie: ${gameCode}`;

  regenerateCodeBtn.classList.add('hidden');
  document.getElementById('hostModifications').classList.add('hidden');
  updateReadyDisplay(false, false);
});

// Ktoś dołączył (host widzi)
socket.on('playerJoined', (nickname) => {
  infoEl.innerText = `Gracz ${nickname} dołączył do gry.`;
});

// Labelka gotowości
function updateReadyDisplay(hostReady, playerReady) {
  hostStatusEl.innerHTML = `Host: <span class="${hostReady ? 'ready-label' : 'not-ready-label'}">
    ${hostReady ? 'Gotowy' : 'Niegotowy'}
  </span>`;
  playerStatusEl.innerHTML = `Gracz: <span class="${playerReady ? 'ready-label' : 'not-ready-label'}">
    ${playerReady ? 'Gotowy' : 'Niegotowy'}
  </span>`;
}

// Regeneracja kodu
regenerateCodeBtn.addEventListener('click', () => {
  socket.emit('regenerateCode');
});

socket.on('codeRegenerated', (newCode) => {
  currentGameCode = newCode;
  gameCodeDisplay.innerText = `Nowy kod Twojej gry: ${newCode}`;
  infoEl.innerText = "Wygenerowano nowy kod! Poprzedni jest nieaktywny.";
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
  socket.emit('startGame', currentGameCode);
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
  // chowamy countdown
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

  // Startujemy licznik czasu (lokalnie)
  startTime = Date.now();
});

// Funkcja do przesuwania tekstu
function updateDisplayedText() {
  const containerWidth = textToTypeEl.parentElement.offsetWidth;
  const middlePosition = containerWidth / 2;
  
  const typedPart = originalText.substring(0, typedLength);
  const currentChar = originalText[typedLength] || '';
  const remainingPart = originalText.substring(typedLength + 1);

  // Nowa struktura z zachowaniem Twoich kolorów
  textToTypeEl.innerHTML = `
    <span style="color: green">${typedPart}</span><span class="current-char">${currentChar}</span><span>${remainingPart}</span>
  `;

  // Znajdź elementy po renderowaniu
  const currentCharEl = textToTypeEl.querySelector('.current-char');
  const allTextEl = textToTypeEl.firstElementChild.parentElement;

  if (currentCharEl) {
    // Oblicz przesunięcie
    const charLeft = currentCharEl.offsetLeft;
    const charWidth = currentCharEl.offsetWidth;
    const targetPosition = middlePosition - (charLeft + charWidth/2);
    
    // Zastosuj przesunięcie
    textToTypeEl.style.transform = `translateX(${targetPosition}px)`;
  }

  // Fallback dla pustego tekstu
  if (typedLength === 0) {
    textToTypeEl.style.transform = `translateX(0)`;
  }
}

// Podczas pisania
typedTextEl.addEventListener('input', () => {
  const value = typedTextEl.value;
  socket.emit('typedText', { gameCode: currentGameCode, typedText: value });
  
  // Wymuś ponowne obliczenie układu
  setTimeout(() => updateDisplayedText(), 0);
});

// Błąd w pisaniu – podświetlanie pola i tekstu na czerwono
socket.on('typingError', () => {
  typedTextEl.value = "";
  typedTextEl.classList.add('flash-error');
  textToTypeEl.classList.add('flash-error-text'); // Dodanie klasy do tekstu

  setTimeout(() => {
    typedTextEl.classList.remove('flash-error');
    textToTypeEl.classList.remove('flash-error-text'); // Usunięcie podświetlenia
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
socket.on('gameFinished', (winnerSocketId) => {
  // Liczymy czas
  const endTime = Date.now();
  const totalSeconds = ((endTime - startTime) / 1000).toFixed(2);

  if (winnerSocketId === socket.id) {
    winnerEl.innerText = "Gratulacje! Wygrałeś!";
    finalTimeEl.innerText = `Twój czas: ${totalSeconds} s`;
  } else {
    winnerEl.innerText = "Niestety, przegrywasz wyścig.";
    finalTimeEl.innerText = `Twój czas: ${totalSeconds} s`;
  }
  // Przycisk do menu
  returnToMenuBtn.classList.remove('hidden');
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
  themeText.textContent = "Tryb jasny"; // Zmiana tekstu na "Tryb jasny"
}

// Obsługa przełącznika trybu ciemnego
themeSwitch.addEventListener('change', () => {
  if (themeSwitch.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
      themeText.textContent = "Tryb jasny"; // Gdy przełączamy na ciemny
  } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
      themeText.textContent = "Tryb ciemny"; // Gdy przełączamy na jasny
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