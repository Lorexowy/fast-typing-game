document.addEventListener("DOMContentLoaded", () => {
  // Połącz się z namespace "/findmatch" – upewnij się, że nazwa jest taka sama jak na serwerze!
  const findMatchSocket = io('/findmatch');

  // Ustaw globalny tryb gry na "findmatch"
  window.currentGameMode = "findmatch";

  // Zmienne stanu specyficzne dla trybu find match
  let findMatchRoomId = null;
  let startTime = null;
  let totalKeystrokes = 0;
  let incorrectKeystrokes = 0;
  let originalText = "";
  let typedLength = 0;

  // Pobierz elementy dedykowane
  const findMatchBtn = document.getElementById('findMatchBtn'); // przycisk z pageIntro
  const pageFindMatchNickname = document.getElementById('pageFindMatchNickname');
  const findMatchNicknameInput = document.getElementById('findMatchNicknameInput');
  const confirmFindMatchBtn = document.getElementById('confirmFindMatchBtn');
  const pageFindMatchWaiting = document.getElementById('pageFindMatchWaiting');
  const pageFindMatchGame = document.getElementById('pageFindMatchGame');
  const findMatchTextToType = document.getElementById('findMatchTextToType');
  const findMatchTypedText = document.getElementById('findMatchTypedText');
  const findMatchOpponentProgress = document.getElementById('findMatchOpponentProgress');
  const findMatchGiveUpBtn = document.getElementById('findMatchGiveUpBtn');
  const findMatchFinalTime = document.getElementById('findMatchFinalTime');
  const findMatchWinner = document.getElementById('findMatchWinner');

  // Upewnij się, że masz element infoEl (np. w HTML)
  const infoEl = document.getElementById('info');

  // Prosta funkcja do przełączania stron
  function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    infoEl.innerText = "";
  }

  // Listener przycisku "Znajdź przeciwnika" – przejście do ekranu wpisywania nicku
  findMatchBtn.addEventListener('click', () => {
    console.log("findMatchBtn kliknięty");
    showPage('pageFindMatchNickname');
  });

  // Listener dla przycisku "Dalej" na ekranie wpisywania nicku
  confirmFindMatchBtn.addEventListener('click', () => {
    const nickname = findMatchNicknameInput.value.trim();
    if (!nickname) {
      alert('Wpisz swój nick.');
      return;
    }
    findMatchSocket.emit('joinFindMatch', nickname);
  });

  // Obsługa komunikatów z serwera
  findMatchSocket.on('findMatchError', (msg) => {
    infoEl.innerText = msg;
  });

  findMatchSocket.on('waitingForOpponent', (msg) => {
    showPage('pageFindMatchWaiting');
    infoEl.innerText = msg;
  });

  // Gdy serwer znajdzie przeciwnika – zapisujemy roomId i pokazujemy popup
  findMatchSocket.on('matchFound', (data) => {
    findMatchRoomId = data.roomId;
    console.log("Match found, roomId:", findMatchRoomId);
    const popup = document.getElementById('resultPopup');
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    popupTitle.innerText = "Gra znaleziona!";
    popupMessage.innerText = `Twój przeciwnik: ${data.opponentNickname}`;
    popup.classList.add("show");
    setTimeout(() => {
      popup.classList.remove("show");
    }, 2000);
  });

  // Countdown – informujemy użytkownika
  findMatchSocket.on('matchCountdown', (time) => {
    infoEl.innerText = `Rozpoczynamy za: ${time} s`;
  });

  // Po zakończeniu countdownu, serwer wysyła event startGame – przechodzimy do ekranu gry
  findMatchSocket.on('startGame', (data) => {
    if (!findMatchRoomId && data.roomId) {
      findMatchRoomId = data.roomId;
    }
    originalText = data.text;
    // Resetujemy stan gry specyficzny dla find match
    typedLength = 0;
    totalKeystrokes = 0;
    incorrectKeystrokes = 0;
    showPage('pageFindMatchGame');
    updateFindMatchDisplayedText();
    findMatchTypedText.value = "";
    findMatchTypedText.disabled = false;
    findMatchTypedText.focus();
    startTime = Date.now();
    infoEl.innerText = "";
  });

  // Funkcja aktualizująca wyświetlany tekst – zabezpieczenie przed brakiem tekstu
  function updateFindMatchDisplayedText() {
    const safeText = (typeof originalText === 'string') ? originalText : "";
    if (safeText === "") return;
    const containerWidth = findMatchTextToType.parentElement.offsetWidth;
    const middlePosition = containerWidth / 2;
    const typedPart = safeText.substring(0, typedLength);
    const currentChar = safeText[typedLength] || '';
    const remainingPart = safeText.substring(typedLength + 1);
    findMatchTextToType.innerHTML = `
    <span style="color: green">${typedPart}</span><span class="current-char">${currentChar}</span><span>${remainingPart}</span>
  `;
    const currentCharEl = findMatchTextToType.querySelector('.current-char');
    if (currentCharEl) {
      const charLeft = currentCharEl.offsetLeft;
      const charWidth = currentCharEl.offsetWidth;
      const targetPosition = middlePosition - (charLeft + charWidth / 2);
      findMatchTextToType.style.transform = `translateX(${targetPosition}px)`;
    }
    if (typedLength === 0) {
      findMatchTextToType.style.transform = "translateX(0)";
    }
  }

  // Listener dla wpisywania tekstu – dedykowany dla find match
  findMatchTypedText.addEventListener('input', () => {
    totalKeystrokes++;
    const value = findMatchTypedText.value;
    typedLength = value.length;
    findMatchSocket.emit('typedText', { roomId: findMatchRoomId, typedText: value });
    setTimeout(() => updateFindMatchDisplayedText(), 0);
  });

  // Listener dla eventu "typingError" – usuwa ostatni znak, jeśli tekst jest niepoprawny
  findMatchSocket.on('typingError', () => {
    let value = findMatchTypedText.value;
    findMatchTypedText.value = value.slice(0, -1);
    findMatchTypedText.classList.add('flash-error');
    setTimeout(() => {
      findMatchTypedText.classList.remove('flash-error');
    }, 300);
  });

  // Listener dla przycisku "Poddaj się" w trybie find match
  findMatchGiveUpBtn.addEventListener('click', () => {
    if (findMatchRoomId) {
      findMatchSocket.emit('giveUp', findMatchRoomId);
    }
  });

  // Listener dla eventu "gameFinished" – zakończenie gry
  findMatchSocket.on('gameFinished', (winnerId) => {
    // Wyłącz pole tekstowe
    findMatchTypedText.disabled = true;
    const endTime = Date.now();
    const totalSeconds = ((endTime - startTime) / 1000).toFixed(2);
    function calculateWPM(typedText, timeInSeconds) {
      const wordsTyped = typedText.length / 5;
      const timeInMinutes = timeInSeconds / 60;
      return timeInMinutes === 0 ? 0 : Math.round(wordsTyped / timeInMinutes);
    }
    const wpm = calculateWPM(findMatchTypedText.value, totalSeconds);
    function calculateAccuracy() {
      if (totalKeystrokes === 0) return 0;
      const correctKeystrokes = totalKeystrokes - incorrectKeystrokes;
      return Math.round((correctKeystrokes / totalKeystrokes) * 100);
    }
    const accuracy = calculateAccuracy();
  
    const popup = document.getElementById('resultPopup');
    const popupTitle = document.getElementById('popupTitle');
    const popupMessage = document.getElementById('popupMessage');
    const popupTime = document.getElementById('popupTime');
    if (winnerId === findMatchSocket.id) {
      popupTitle.innerText = "Congratulations!";
      popupMessage.innerText = "You won the race!";
    } else if (winnerId === "giveUp") {
      popupTitle.innerText = "The game is over!";
      popupMessage.innerText = "The game ended by surrender!";
    } else {
      popupTitle.innerText = "Loser!";
      popupMessage.innerText = "Your opponent was faster!";
    }
    popupTime.innerText = `Playing time: ${totalSeconds} s`;
    popup.classList.add("show");
    // Resetujemy roomId
    findMatchRoomId = null;
  });

  const popupCloseBtn = document.getElementById('popupCloseBtn');
  if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', () => {
      // Ukryj popup
      document.getElementById('resultPopup').classList.remove("show");
      // Przenieś użytkownika do strony głównej (pageIntro)
      showPage('pageIntro');
    });
  }
});
