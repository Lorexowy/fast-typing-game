document.addEventListener("DOMContentLoaded", () => {
    // Pobierz elementy związane z popupem wersji
    const versionInfo = document.getElementById('versionInfo');
    const versionPopup = document.getElementById('versionPopup');
    const closeVersionPopupIcon = document.getElementById('closeVersionPopup');
    const closeVersionPopupBtn = document.getElementById('closeVersionPopupBtn');
  
    // Funkcja otwierająca popup
    function openVersionPopup() {
      versionPopup.classList.add('show');
    }
  
    // Funkcja zamykająca popup
    function closeVersionPopup() {
      versionPopup.classList.remove('show');
    }
  
    // Listener dla kliknięcia elementu z wersją
    if (versionInfo) {
      versionInfo.addEventListener('click', () => {
        openVersionPopup();
      });
    }
  
    // Listener dla przycisku "X" w popupie
    if (closeVersionPopupIcon) {
      closeVersionPopupIcon.addEventListener('click', () => {
        closeVersionPopup();
      });
    }
  
    // Listener dla przycisku "Close" w popupie
    if (closeVersionPopupBtn) {
      closeVersionPopupBtn.addEventListener('click', () => {
        closeVersionPopup();
      });
    }
  });
  