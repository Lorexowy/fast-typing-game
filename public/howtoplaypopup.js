document.addEventListener("DOMContentLoaded", () => {
    // Pobierz przycisk "How to play?" z pageIntro
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    // Pobierz popup oraz przyciski do jego zamknięcia
    const howToPlayPopup = document.getElementById('howToPlayPopup');
    const closeHowToPlay = document.getElementById('closeHowToPlay');
    const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn');
  
    // Funkcja pokazująca popup
    function openHowToPlay() {
      howToPlayPopup.classList.add('show');
    }
  
    // Funkcja zamykająca popup
    function closeHowToPlayPopup() {
      howToPlayPopup.classList.remove('show');
    }
  
    // Obsługa kliknięcia przycisku "How to play?"
    if (howToPlayBtn) {
      howToPlayBtn.addEventListener('click', () => {
        openHowToPlay();
      });
    }
  
    // Obsługa przycisku "X" w popupie
    if (closeHowToPlay) {
      closeHowToPlay.addEventListener('click', () => {
        closeHowToPlayPopup();
      });
    }
  
    // Obsługa przycisku "Close" w dole popupu
    if (closeHowToPlayBtn) {
      closeHowToPlayBtn.addEventListener('click', () => {
        closeHowToPlayPopup();
      });
    }
  });
  