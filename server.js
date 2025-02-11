// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Obiekt gier
const games = {};

// Przykładowe teksty do pisania
const textsArray = require('./texts');

// Pomocnicza funkcja do generowania kodu (4 znaki)
function generateGameCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Połączono:', socket.id);

  // Host tworzy grę
  socket.on('createGame', (nickname) => {
    const code = generateGameCode();
    games[code] = {
      host: socket.id,
      hostNickname: nickname,
      player: null,
      playerNickname: null,
      hostReady: false,
      playerReady: false,
      gameStarted: false,
      countdownInProgress: false,
      originalText: ""
    };
    socket.join(code);
    socket.emit('gameCreated', code);
  });

  // Gracz dołącza
  socket.on('joinGame', ({ gameCode, nickname }) => {
    const game = games[gameCode];
    if (game && !game.player && !game.gameStarted) {
      game.player = socket.id;
      game.playerNickname = nickname;
      socket.join(gameCode);

      io.to(game.host).emit('playerJoined', nickname);
      // Wysyłamy obiekt z gameCode i hostNickname do klienta-gracza
      socket.emit('joinedGame', { gameCode, hostNickname: game.hostNickname });
    } else {
      socket.emit('errorMsg', 'Nie można dołączyć: kod niepoprawny, gra pełna lub już wystartowała.');
    }
  });

  // Host regeneruje kod (dopóki gra się nie zaczęła i nie ma countdown)
  socket.on('regenerateCode', () => {
    let oldCode = null;
    for (const code in games) {
      const g = games[code];
      if (g.host === socket.id && !g.gameStarted && !g.countdownInProgress) {
        oldCode = code;
        break;
      }
    }
    if (!oldCode) {
      socket.emit('errorMsg', 'Nie można wygenerować nowego kodu – gra już wystartowała lub nie jesteś hostem.');
      return;
    }
    const oldGame = games[oldCode];
    io.in(oldCode).emit('errorMsg', 'Gra już nie istnieje. Host się rozłączył.');
    io.in(oldCode).emit('hostLeft');
    const newCode = generateGameCode();
    games[newCode] = {
      host: socket.id,
      hostNickname: oldGame.hostNickname,
      player: null,
      playerNickname: null,
      hostReady: false,
      playerReady: false,
      gameStarted: false,
      countdownInProgress: false,
      originalText: ""
    };
    delete games[oldCode];
    socket.leave(oldCode);
    socket.join(newCode);
    socket.emit('codeRegenerated', newCode);
  });

  // Kliknięcie "Gotowy"
  socket.on('playerReady', (gameCode) => {
    const game = games[gameCode];
    if (!game) return;
    if (socket.id === game.host) {
      game.hostReady = true;
    } else if (socket.id === game.player) {
      game.playerReady = true;
    }
    io.in(gameCode).emit('updateReadyStatus', {
      hostReady: game.hostReady,
      playerReady: game.playerReady
    });
  });

  // Host kliknął "Rozpocznij grę" => 5s countdown
  socket.on('startGame', (data) => {
    const gameCode = data.gameCode;
    const game = games[gameCode];
    if (!game) return;
    
    // Pobieramy poziom trudności, a także tryb gry z danych odebranych od hosta
    const difficulty = game.difficulty || data.difficulty;
    const mode = data.mode;  // Tryb gry ustawiony przez hosta
    game.mode = mode;  // Zapisujemy tryb w obiekcie gry
    
    if (
      socket.id === game.host &&
      game.hostReady &&
      game.playerReady &&
      !game.gameStarted &&
      !game.countdownInProgress
    ) {
      game.countdownInProgress = true;
      let counter = 5;
      
      const intervalId = setInterval(() => {
        io.in(gameCode).emit('countdown', counter);
        counter--;
        
        if (counter < 0) {
          clearInterval(intervalId);
          game.gameStarted = true;
          game.countdownInProgress = false;
          
          let textsForDifficulty = textsArray.filter(t => t.difficulty === difficulty);
          if (textsForDifficulty.length === 0) {
            textsForDifficulty = textsArray;
          }
          const idx = Math.floor(Math.random() * textsForDifficulty.length);
          game.originalText = textsForDifficulty[idx].text;
          
          // Emitujemy obiekt zawierający zarówno tekst, jak i tryb gry
          io.in(gameCode).emit('gameStarted', { text: game.originalText, mode: game.mode });
        }
      }, 1000);
      
    } else {
      socket.emit('errorMsg', 'Nie można wystartować – sprawdź gotowość albo gra już wystartowała.');
    }
  });

  // Podczas pisania
  socket.on('typedText', ({ gameCode, typedText }) => {
    const game = games[gameCode];
    if (!game || !game.gameStarted) return;
    const original = game.originalText;
    let correctCount = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === original[i]) {
        correctCount++;
      } else {
        break;
      }
    }
    socket.emit('yourProgress', { correctCount });
    socket.broadcast.to(gameCode).emit('opponentProgress', {
      playerId: socket.id,
      typedLength: correctCount
    });
    if (typedText === original) {
      io.in(gameCode).emit('gameFinished', socket.id);
    } else if (!original.startsWith(typedText)) {
      socket.emit('typingError');
    }
  });

  // Rozłączenie
  socket.on('disconnect', () => {
    console.log('Rozłączono:', socket.id);
    for (const code in games) {
      const g = games[code];
      if (g.host === socket.id || g.player === socket.id) {
        io.in(code).emit('errorMsg', 'Drugi gracz się rozłączył. Gra zakończona.');
        delete games[code];
      }
    }
  });

  // Obsługa zdarzenia "giveUp"
  socket.on('giveUp', (gameCode) => {
    console.log(`Przycisk 'Poddaj się' wciśnięty przez ${socket.id} w grze ${gameCode}`);

    const game = games[gameCode];
    if (!game) {
        console.log("Błąd: Gra nie istnieje.");
        socket.emit('errorMsg', 'Błąd: Gra nie istnieje.');
        return;
    }

    let winnerSocketId = null;
    if (socket.id === game.host) {
        winnerSocketId = game.player;
    } else if (socket.id === game.player) {
        winnerSocketId = game.host;
    }

    if (!winnerSocketId) {
        console.log("Błąd: Nie ma przeciwnika.");
        socket.emit('errorMsg', 'Nie ma przeciwnika lub gra jeszcze nie rozpoczęła się.');
        return;
    }

    console.log(`Gra zakończona. Zwycięzca: ${winnerSocketId}`);
    io.in(gameCode).emit('gameFinished', { winnerSocketId, surrendered: true });

    // Usuwamy grę, aby nowa mogła działać poprawnie
    delete games[gameCode];
  });

  socket.on('sendStats', ({ gameCode, wpm, accuracy }) => {
    const game = games[gameCode];
    if (!game) return;

    if (socket.id === game.host) {
        game.hostWPM = wpm;
        game.hostAccuracy = accuracy;
    } else if (socket.id === game.player) {
        game.playerWPM = wpm;
        game.playerAccuracy = accuracy;
    }

    if (game.hostWPM !== undefined && game.playerWPM !== undefined) {
        io.to(gameCode).emit('displayStats', {
            hostNickname: game.hostNickname,
            playerNickname: game.playerNickname,
            hostWPM: game.hostWPM,
            playerWPM: game.playerWPM,
            hostAccuracy: game.hostAccuracy,
            playerAccuracy: game.playerAccuracy
        });
    }
  });




});

// Import modułu dla trybu find match
const setupFindMatch = require('./findmatchserver');
setupFindMatch(io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
