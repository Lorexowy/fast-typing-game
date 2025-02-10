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

const menuBtns = document.querySelectorAll('.menuBtn');

const modeSelect = document.getElementById('modeSelect');

const singleplayerBtn = document.getElementById('singleplayerBtn');
const pageSingleplayerNickname = document.getElementById('pageSingleplayerNickname');
const singleplayerNicknameInput = document.getElementById('singleplayerNicknameInput');
const confirmSingleplayerBtn = document.getElementById('confirmSingleplayerBtn');
const pageSingleplayerLobby = document.getElementById('pageSingleplayerLobby');
const singleplayerNicknameDisplay = document.getElementById('singleplayerNicknameDisplay');
const singleplayerDifficulty = document.getElementById('singleplayerDifficulty');
const singleplayerMode = document.getElementById('singleplayerMode');
const startSingleplayerGameBtn = document.getElementById('startSingleplayerGameBtn');


// Nowe: element wyświetlający czas pisania
const finalTimeEl = document.getElementById('finalTime');

// Stan gry
let currentGameCode = null;
let isHost = false;
let originalText = "";
let typedLength = 0;
let gameEnded = false;
let gameMode = modeSelect ? modeSelect.value : "hardcore"; // domyślnie hardcore
let totalKeystrokes = 0;
let incorrectKeystrokes = 0;

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
  // Wysyłamy również tryb gry, ustawiony przez hosta
  socket.emit('startGame', { gameCode: currentGameCode, difficulty, mode: modeSelect.value });
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
socket.on('gameStarted', (data) => {
  if (typeof data === 'object' && data.text !== undefined && data.mode !== undefined) {
    originalText = data.text;
    gameMode = data.mode;
  } else {
    originalText = data;
  }
  countdownContainer.classList.add('hidden');
  countdownNumber.textContent = "5";
  countdownBarProgress.style.width = "100%";
  typedLength = 0;
  showPage('pageGame');
  textToTypeEl.innerHTML = "";
  updateDisplayedText();
  typedTextEl.value = "";
  typedTextEl.disabled = false;
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
  totalKeystrokes++; // Każde naciśnięcie klawisza zwiększa licznik
  const value = typedTextEl.value;

  if (currentGameCode) {
      // Multiplayer (wysyłamy wpisany tekst do serwera)
      socket.emit('typedText', { gameCode: currentGameCode, typedText: value });
  } else {
      // Singleplayer (lokalna obsługa)
      let correctCount = 0;
      let isCorrect = true;

      for (let i = 0; i < value.length; i++) {
          if (value[i] === originalText[i]) {
              correctCount++;
          } else {
              isCorrect = false;
              break;
          }
      }

      // Tryb NORMAL - błędny znak zostaje usunięty
      if (!isCorrect && gameMode === "normal") {
          incorrectKeystrokes++;
          typedTextEl.value = value.slice(0, -1); // Usuwamy ostatni wpisany znak
          typedTextEl.classList.add('flash-error');
          setTimeout(() => {
              typedTextEl.classList.remove('flash-error');
          }, 300);
      }

      // Tryb HARDCORE - reset całego tekstu
      if (!isCorrect && gameMode === "hardcore") {
          incorrectKeystrokes++;
          typedTextEl.value = ""; // Resetowanie tekstu
          typedLength = 0; // Reset progresu
          typedTextEl.classList.add('flash-error');
          textToTypeEl.classList.add('flash-error-text');
          document.body.classList.add("shake");

          setTimeout(() => {
              typedTextEl.classList.remove('flash-error');
              textToTypeEl.classList.remove('flash-error-text');
              document.body.classList.remove("shake");
          }, 500);
      }

      // Aktualizacja wyświetlanego tekstu
      typedLength = correctCount;
      updateDisplayedText();

      // Jeśli wpisany tekst jest poprawny, kończymy grę
      if (value === originalText) {
          setTimeout(() => endSingleplayerGame(), 500);
      }
  }

  setTimeout(() => updateDisplayedText(), 0);
});



// Błąd w pisaniu – podświetlanie pola i tekstu na czerwono
socket.on('typingError', () => {
  incorrectKeystrokes++; // Każdy błąd zwiększa licznik błędów

  if (gameMode === "hardcore") {
    // Hardcore: resetujemy pole i cofamy postęp (tak jak dotychczas)
    typedTextEl.value = "";
    typedTextEl.classList.add('flash-error');
    textToTypeEl.classList.add('flash-error-text');
    setTimeout(() => {
      typedTextEl.classList.remove('flash-error');
      textToTypeEl.classList.remove('flash-error-text');
    }, 500);
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 300);
  } else if (gameMode === "normal") {
    // Normal: usuwamy ostatni wpisany znak i umożliwiamy kontynuację
    typedTextEl.value = typedTextEl.value.slice(0, -1);
    typedTextEl.classList.add('flash-error');
    setTimeout(() => {
      typedTextEl.classList.remove('flash-error');
    }, 300);
  }
});


// Nasz postęp
socket.on('yourProgress', ({ correctCount }) => {
  typedLength = correctCount;
  updateDisplayedText();
});

// Koniec gry
socket.on('gameFinished', (data) => {
  console.log("Gra zakończona, resetujemy stan.");

  let winnerSocketId, surrendered = false;
  if (typeof data === 'object' && data !== null) {
    winnerSocketId = data.winnerSocketId;
    surrendered = data.surrendered;
  } else {
    winnerSocketId = data;
  }

  const endTime = Date.now();
  const totalSeconds = ((endTime - startTime) / 1000).toFixed(2);
  
  //obliczanie WPM
  function calculateWPM(typedText, timeInSeconds) {
    const wordsTyped = typedText.length / 5; // Średnio 5 znaków na słowo
    const timeInMinutes = timeInSeconds / 60;
    
    if (timeInMinutes === 0) return 0; // Zapobiega dzieleniu przez zero
    return Math.round(wordsTyped / timeInMinutes);
  }

  const wpm = calculateWPM(typedTextEl.value, totalSeconds);
  socket.emit('sendWPM', { gameCode: currentGameCode, wpm });

  //obliczanie dokładności
  function calculateAccuracy() {
    if (totalKeystrokes === 0) return 0; // Zapobiega dzieleniu przez zero
    return Math.round(((totalKeystrokes - incorrectKeystrokes) / totalKeystrokes) * 100);
  }

  const accuracy = calculateAccuracy();
  socket.emit('sendStats', { gameCode: currentGameCode, wpm, accuracy });

  const popup = document.getElementById('resultPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  const popupTitle = document.getElementById('popupTitle');
  const popupMessage = document.getElementById('popupMessage');
  const popupTime = document.getElementById('popupTime');
  const popupCloseBtn = document.getElementById('popupCloseBtn');

  if (winnerSocketId === socket.id) {
    popupTitle.innerText = "Gratulacje!";
    popupMessage.innerText = surrendered ? "Przeciwnik się poddał!" : "Wygrałeś wyścig!";
    popupTime.innerText = `Czas gry: ${totalSeconds} s`;
  } else {
    popupTitle.innerText = "Przegrana!";
    popupMessage.innerText = surrendered ? "Poddałeś się..." : "Twój przeciwnik był szybszy!";
    popupTime.innerText = `Czas gry: ${totalSeconds} s`;
  }

  popup.classList.add("show");
  popupOverlay.classList.add("show");

  // Resetujemy stan gry, aby można było zacząć nową grę
  gameEnded = false;
  giveUpBtn.disabled = false;
  typedTextEl.disabled = false;
  currentGameCode = null; // Resetujemy kod gry
  typedTextEl.value = "";
  typedLength = 0;
  startTime = null;

  // Przywracamy poprawną obsługę przycisku powrotu do menu
  popupCloseBtn.removeEventListener('click', closePopup); // Usuwamy poprzedni event
  popupCloseBtn.addEventListener('click', closePopup);

  function closePopup() {
    popup.classList.remove("show");
    popupOverlay.classList.remove("show");
    showPage('pageIntro');
  }

  console.log("Zresetowano zmienne gry i poprawiono obsługę powrotu do menu.");
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
  console.log(`Kliknięto "Poddaj się".`);
  
  if (currentGameCode) {
      // Multiplayer - wysyłamy zdarzenie do serwera
      socket.emit('giveUp', currentGameCode);
  } else {
      // Singleplayer - kończymy grę lokalnie
      console.log("Gracz poddał się w trybie singleplayer.");
      endSingleplayerGame();
  }
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

menuBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    gameEnded = false;
    giveUpBtn.disabled = false;
    currentGameCode = null;
    originalText = "";
    typedLength = 0;
    startTime = null;
    
    // Wyczyszczenie komunikatów i pola tekstowego
    infoEl.innerText = "";
    winnerEl.innerText = "";
    finalTimeEl.innerText = "";
    typedTextEl.value = "";
    
    showPage('pageIntro');
  });
});

if (modeSelect) {
  modeSelect.addEventListener('change', () => {
    gameMode = modeSelect.value;
    // Możesz opcjonalnie wyświetlić komunikat lub zapisać wartość do localStorage
    console.log("Tryb gry zmieniony na:", gameMode);
  });
}

socket.on('displayStats', ({ hostNickname, playerNickname, hostWPM, playerWPM, hostAccuracy, playerAccuracy }) => {
  const popupWPM = document.getElementById('popupWPM');

  popupWPM.innerHTML = `
      <p>Gracz ${hostNickname}: WPM: <strong>${hostWPM}</strong> | Accuracy: <strong>${hostAccuracy}%</strong></p>
      <p>Gracz ${playerNickname}: WPM: <strong>${playerWPM}</strong> | Accuracy: <strong>${playerAccuracy}%</strong></p>
  `;
});

// Obsługa przycisku "Singleplayer"
singleplayerBtn.addEventListener('click', () => {
  showPage('pageSingleplayerNickname');
});

// Obsługa wpisywania nicku
confirmSingleplayerBtn.addEventListener('click', () => {
  const nickname = singleplayerNicknameInput.value.trim();
  if (!nickname) {
      alert('Wpisz swój nick.');
      return;
  }
  singleplayerNicknameDisplay.textContent = nickname;
  showPage('pageSingleplayerLobby');
});

// Obsługa startu gry singleplayer
// Obsługa startu gry singleplayer
startSingleplayerGameBtn.addEventListener('click', () => {
  const difficulty = singleplayerDifficulty.value;
  const mode = singleplayerMode.value;

  // Pobranie tekstów dla singleplayera
  import('./singleplayertexts.js')
      .then(module => {
          const texts = module.default || module;
          const textsForDifficulty = texts.filter(t => t.difficulty === difficulty);

          if (textsForDifficulty.length === 0) {
              alert("Brak tekstów dla wybranego poziomu trudności!");
              return;
          }

          const textToType = textsForDifficulty[Math.floor(Math.random() * textsForDifficulty.length)].text;
          
          // Pokazanie pop-upa odliczania
          const countdownPopupOverlay = document.getElementById('countdownPopupOverlay');
          const countdownPopup = document.getElementById('countdownPopup');
          const countdownPopupNumber = document.getElementById('countdownPopupNumber');

          countdownPopupOverlay.classList.add('show');
          countdownPopup.classList.add('show');

          let countdown = 5;
          countdownPopupNumber.textContent = countdown;

          const countdownInterval = setInterval(() => {
              countdown--;
              countdownPopupNumber.textContent = countdown;

              if (countdown <= 0) {
                  clearInterval(countdownInterval);

                  // Ukrycie pop-upa odliczania
                  countdownPopupOverlay.classList.remove('show');
                  countdownPopup.classList.remove('show');

                  // Rozpoczęcie gry po odliczaniu
                  originalText = textToType;
                  gameMode = mode;
                  showPage('pageGame');
                  textToTypeEl.innerHTML = "";
                  updateDisplayedText();
                  typedTextEl.value = "";
                  typedTextEl.disabled = false;
                  typedTextEl.focus();
                  startTime = Date.now();
              }
          }, 1000);
      })
      .catch(error => {
          console.error("Błąd podczas wczytywania singleplayertexts.js:", error);
          alert("Nie udało się wczytać tekstów dla singleplayera.");
      });
});




function endSingleplayerGame() {
  console.log("Gra singleplayer zakończona.");

  const endTime = Date.now();
  const totalSeconds = ((endTime - startTime) / 1000).toFixed(2);

  // Blokowanie wpisywania tekstu
  typedTextEl.disabled = true;

  // Obliczanie WPM
  function calculateWPM(typedText, timeInSeconds) {
      const wordsTyped = typedText.length / 5; // Średnio 5 znaków na słowo
      const timeInMinutes = timeInSeconds / 60;
      return timeInMinutes === 0 ? 0 : Math.round(wordsTyped / timeInMinutes);
  }
  const wpm = calculateWPM(typedTextEl.value, totalSeconds);

  // Obliczanie dokładności
  function calculateAccuracy() {
    if (totalKeystrokes === 0) return 0; // Zapobiega dzieleniu przez zero
    
    // Prawidłowe znaki to poprawnie wpisane litery
    const correctKeystrokes = totalKeystrokes - incorrectKeystrokes;
    
    // Accuracy to stosunek poprawnych znaków do wszystkich naciśnięć klawiatury
    return Math.round((correctKeystrokes / totalKeystrokes) * 100);
  }

  const accuracy = calculateAccuracy();

  // Wyświetlenie popupu końcowego
  const popup = document.getElementById('resultPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  const popupTitle = document.getElementById('popupTitle');
  const popupMessage = document.getElementById('popupMessage');
  const popupTime = document.getElementById('popupTime');
  const popupWPM = document.getElementById('popupWPM');
  const popupCloseBtn = document.getElementById('popupCloseBtn');

  popupTitle.innerText = "Gra zakończona!";
  popupMessage.innerText = "Twój wynik:";
  popupTime.innerText = `Czas gry: ${totalSeconds} s`;
  popupWPM.innerHTML = `WPM: <strong>${wpm}</strong> | Dokładność: <strong>${accuracy}%</strong>`;

  popup.classList.add("show");
  popupOverlay.classList.add("show");

  // Resetowanie danych po zamknięciu popupa
  popupCloseBtn.addEventListener('click', () => {
      popup.classList.remove("show");
      popupOverlay.classList.remove("show");
      resetSingleplayerGame(); // NOWA FUNKCJA RESETUJĄCA
      showPage('pageIntro');
  });

  console.log("Zakończono grę singleplayer. WPM:", wpm, "Dokładność:", accuracy);
}

function resetSingleplayerGame() {
  console.log("Resetowanie danych singleplayer...");

  // Czyszczenie zmiennych
  originalText = "";
  typedLength = 0;
  startTime = null;
  totalKeystrokes = 0;
  incorrectKeystrokes = 0;

  // Resetowanie pola wpisywania tekstu
  typedTextEl.value = "";
  typedTextEl.disabled = false;

  // Resetowanie wyświetlanego tekstu
  textToTypeEl.innerHTML = "";
  
  // Resetowanie trybu gry
  gameMode = "normal"; // Domyślnie tryb normal
}

function typeTitleEffect() {
  const titleElement = document.querySelector('.title'); // Pobieramy element tytułu
  const titleText = "Fast Typing Race"; // Tekst do wpisania
  let index = 0;
  
  titleElement.textContent = ""; // Czyścimy domyślny tekst

  function typeNextLetter() {
      if (index < titleText.length) {
          titleElement.textContent += titleText[index];
          index++;
          setTimeout(typeNextLetter, 100); // Czas opóźnienia wpisywania kolejnych liter (100ms)
      }
  }

  typeNextLetter(); // Uruchomienie efektu wpisywania
}

// Uruchomienie animacji po załadowaniu strony
document.addEventListener("DOMContentLoaded", typeTitleEffect);


