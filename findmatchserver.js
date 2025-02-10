module.exports = function(io) {
  const normalTexts = require('./normaltexts');
  // Używamy namespace "/findmatch" – klient musi łączyć się z tą samą nazwą
  const findMatch = io.of('/findmatch');

  let waitingPlayers = {};
  let activeGames = {};

  function generateGameCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  findMatch.on('connection', (socket) => {
    console.log('[FindMatch] Połączono socket:', socket.id);

    socket.on('joinFindMatch', (nickname) => {
      for (let id in waitingPlayers) {
        if (waitingPlayers[id].nickname === nickname) {
          socket.emit('findMatchError', 'Ten nick jest już w użyciu, wybierz inny.');
          return;
        }
      }
      waitingPlayers[socket.id] = { nickname };
      console.log(`[FindMatch] Gracz ${nickname} dołączył do kolejki.`);
      socket.emit('waitingForOpponent', 'Szukam przeciwnika...');

      let otherPlayerId = null;
      for (let id in waitingPlayers) {
        if (id !== socket.id) {
          otherPlayerId = id;
          break;
        }
      }
      if (otherPlayerId) {
        const player1 = waitingPlayers[otherPlayerId];
        const player2 = waitingPlayers[socket.id];
        delete waitingPlayers[otherPlayerId];
        delete waitingPlayers[socket.id];

        const roomId = generateGameCode();
        socket.join(roomId);
        // Używamy socketsJoin (Socket.IO 4.x)
        findMatch.to(otherPlayerId).socketsJoin(roomId);

        socket.emit('matchFound', { opponentNickname: player1.nickname, roomId });
        findMatch.to(otherPlayerId).emit('matchFound', { opponentNickname: player2.nickname, roomId });

        let countdown = 5;
        const countdownInterval = setInterval(() => {
          findMatch.to(roomId).emit('matchCountdown', countdown);
          countdown--;
          if (countdown < 0) {
            clearInterval(countdownInterval);
            const randomIndex = Math.floor(Math.random() * normalTexts.length);
            const selectedText = normalTexts[randomIndex]; // Zakładamy, że normalTexts jest tablicą ciągów
            activeGames[roomId] = { originalText: selectedText, mode: 'normal' };
            findMatch.to(roomId).emit('startGame', { text: selectedText, mode: 'normal', roomId });
          }
        }, 1000);
      }
    });

    socket.on('typedText', (data) => {
      const roomId = data.roomId;
      const typedText = data.typedText;
      const game = activeGames[roomId];
      if (!game || typeof game.originalText !== 'string') return;
      const original = game.originalText;
      if (!typedText || typeof typedText !== 'string') return;
      let correctCount = 0;
      for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === original[i]) {
          correctCount++;
        } else {
          break;
        }
      }
      socket.emit('yourProgress', { correctCount });
      socket.broadcast.to(roomId).emit('opponentProgress', { typedLength: correctCount });
      if (typedText === original) {
        findMatch.to(roomId).emit('gameFinished', socket.id);
        delete activeGames[roomId];
      } else if (!original.startsWith(typedText)) {
        socket.emit('typingError');
      }
    });

    socket.on('giveUp', (roomId) => {
      if (activeGames[roomId]) {
        findMatch.to(roomId).emit('gameFinished', 'giveUp');
        delete activeGames[roomId];
      }
    });

    socket.on('disconnect', () => {
      console.log('[FindMatch] Rozłączono socket:', socket.id);
      if (waitingPlayers[socket.id]) {
        delete waitingPlayers[socket.id];
      }
    });
  });
};
