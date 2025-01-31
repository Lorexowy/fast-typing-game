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
const textsArray = [
  "Oto dłuższy tekst, który użytkownik ma przepisać. Składa się z kilku zdań, polskich znaków i przecinków.",
  "Drugi przykładowy tekst, z polskimi znakami: zażółć gęślą jaźń!",
  "Trzeci tekst - jeszcze dłuższy. Możesz w nim dodać wiele znaków, aby naprawdę przetestować szybką klawiaturę."
];

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
      gameStarted: false,        // =true dopiero po zakończeniu odliczania
      countdownInProgress: false,// =true podczas 5-sek. odliczania
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
      socket.emit('joinedGame', gameCode);
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
    // Powiadamiamy stary pokój, że gra nie istnieje
    io.in(oldCode).emit('errorMsg', 'Gra już nie istnieje. Host się rozłączył.');
    io.in(oldCode).emit('hostLeft');

    // Tworzymy nowy kod i nową grę
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

    // Usuwamy starą
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
  socket.on('startGame', (gameCode) => {
    const game = games[gameCode];
    if (!game) return;

    if (socket.id === game.host && game.hostReady && game.playerReady && !game.gameStarted && !game.countdownInProgress) {
      game.countdownInProgress = true;
      let counter = 5;

      const intervalId = setInterval(() => {
        io.in(gameCode).emit('countdown', counter);
        counter--;

        if (counter < 0) {
          clearInterval(intervalId);
          game.gameStarted = true;
          game.countdownInProgress = false;

          const idx = Math.floor(Math.random() * textsArray.length);
          game.originalText = textsArray[idx];

          io.in(gameCode).emit('gameStarted', game.originalText);
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

    // Sprawdzenie, czy gracz ukończył cały tekst
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
});

server.listen(3000, () => {
  console.log('Serwer działa na porcie 3000');
});
