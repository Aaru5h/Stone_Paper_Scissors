const gameManager = require('../game/GameManager');
const db = require('../db');

const ROUND_TIMER_MS = 4000; // 4 seconds per round

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    // Create a new room
    socket.on('create-room', async ({ username }) => {
      try {
        // Create or get user from database
        const user = await db.createUser(username);
        const room = gameManager.createRoom(socket.id, username, user.id);
        
        socket.join(room.code);
        socket.emit('room-created', {
          roomCode: room.code,
          user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses }
        });
        console.log(`🏠 Room ${room.code} created by ${username}`);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // Join an existing room
    socket.on('join-room', async ({ roomCode, username }) => {
      try {
        const user = await db.createUser(username);
        const result = gameManager.joinRoom(roomCode.toUpperCase(), socket.id, username, user.id);
        
        if (!result.success) {
          socket.emit('error', { message: result.error });
          return;
        }

        socket.join(roomCode);
        
        // Notify the joining player
        socket.emit('joined-room', {
          roomCode: result.room.code,
          user: { id: user.id, username: user.username, wins: user.wins, losses: user.losses },
          host: result.room.host,
          totalRounds: result.room.totalRounds
        });

        // Notify the host
        socket.to(roomCode).emit('player-joined', {
          guest: {
            username: username,
            userId: user.id
          }
        });

        console.log(`👤 ${username} joined room ${roomCode}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Set number of rounds (host only)
    socket.on('set-rounds', ({ roomCode, rounds }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room || room.host.socketId !== socket.id) {
        socket.emit('error', { message: 'Only host can set rounds' });
        return;
      }

      const result = gameManager.setRounds(roomCode, rounds);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      io.to(roomCode).emit('rounds-set', { totalRounds: rounds });
    });

    // Start the game
    socket.on('start-game', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room || room.host.socketId !== socket.id) {
        socket.emit('error', { message: 'Only host can start game' });
        return;
      }

      const result = gameManager.startGame(roomCode);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      // Start the first round
      startRound(io, roomCode);
    });

    // Player makes a choice
    socket.on('make-choice', ({ roomCode, choice }) => {
      const result = gameManager.makeChoice(roomCode, socket.id, choice);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      // Acknowledge choice received
      socket.emit('choice-received', { choice });

      // If both players have chosen, end round immediately
      if (result.bothChosen) {
        gameManager.clearRoomTimer(roomCode);
        endRound(io, roomCode);
      }
    });

    // Player disconnects
    socket.on('disconnect', () => {
      console.log(`🔌 Player disconnected: ${socket.id}`);
      const result = gameManager.leaveRoom(socket.id);
      
      if (result) {
        gameManager.clearRoomTimer(result.roomCode);
        
        if (result.role === 'host') {
          // Room is destroyed, notify guest if any
          io.to(result.roomCode).emit('room-closed', { reason: 'Host left the game' });
        } else {
          // Guest left, notify host
          io.to(result.roomCode).emit('player-left', { reason: 'Opponent left the game' });
        }
      }
    });
  });

  // Cleanup old rooms every 10 minutes
  setInterval(() => {
    gameManager.cleanupOldRooms();
  }, 10 * 60 * 1000);
}

function startRound(io, roomCode) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return;

  // Notify both players that round is starting
  io.to(roomCode).emit('round-start', {
    round: room.currentRound,
    totalRounds: room.totalRounds,
    timerMs: ROUND_TIMER_MS
  });

  // Set timer for round end
  const timer = setTimeout(() => {
    endRound(io, roomCode);
  }, ROUND_TIMER_MS);

  gameManager.setRoomTimer(roomCode, timer);
}

async function endRound(io, roomCode) {
  const roundResult = gameManager.processRoundEnd(roomCode);
  if (!roundResult) return;

  // Send round result to both players
  io.to(roomCode).emit('round-result', roundResult);

  if (roundResult.gameOver) {
    // Game is over, update database
    if (roundResult.finalWinner.winner !== 'tie') {
      try {
        await db.updateUserStats(roundResult.finalWinner.userId, roundResult.finalWinner.loserUserId);
        await db.recordGame(
          roundResult.finalWinner.userId,
          roundResult.finalWinner.loserUserId,
          Math.max(roundResult.scores.host, roundResult.scores.guest),
          Math.min(roundResult.scores.host, roundResult.scores.guest),
          gameManager.getRoom(roomCode)?.totalRounds || 0
        );
        console.log(`🏆 Game over! Winner: ${roundResult.finalWinner.username}`);
      } catch (error) {
        console.error('Error updating game stats:', error);
      }
    }
    
    // After a short delay, send final game over
    setTimeout(() => {
      io.to(roomCode).emit('game-over', {
        winner: roundResult.finalWinner,
        finalScores: roundResult.scores
      });
    }, 2000);
  } else {
    // Start next round after a short delay
    setTimeout(() => {
      startRound(io, roomCode);
    }, 2000);
  }
}

module.exports = { setupSocketHandlers };
