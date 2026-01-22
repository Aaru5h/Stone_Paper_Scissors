// Game Manager - Handles room creation, game state, and logic

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room data
  }

  // Generate a random 6-character room code
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, 1, I
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Make sure code is unique
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  // Create a new room
  createRoom(hostSocketId, hostUsername, hostUserId) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      host: {
        socketId: hostSocketId,
        username: hostUsername,
        userId: hostUserId
      },
      guest: null,
      totalRounds: 3, // Default
      currentRound: 0,
      scores: {
        host: 0,
        guest: 0
      },
      choices: {
        host: null,
        guest: null
      },
      gameState: 'waiting', // waiting, ready, playing, roundEnd, gameOver
      roundTimer: null,
      createdAt: Date.now()
    };
    this.rooms.set(roomCode, room);
    return room;
  }

  // Get room by code
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  // Join a room
  joinRoom(roomCode, guestSocketId, guestUsername, guestUserId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    if (room.guest) {
      return { success: false, error: 'Room is full' };
    }
    if (room.gameState !== 'waiting') {
      return { success: false, error: 'Game already in progress' };
    }
    room.guest = {
      socketId: guestSocketId,
      username: guestUsername,
      userId: guestUserId
    };
    room.gameState = 'ready';
    return { success: true, room };
  }

  // Set number of rounds (host only)
  setRounds(roomCode, rounds) {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (rounds < 1 || rounds > 10) {
      return { success: false, error: 'Rounds must be between 1 and 10' };
    }
    room.totalRounds = rounds;
    return { success: true, room };
  }

  // Start the game
  startGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (!room.guest) return { success: false, error: 'Need 2 players to start' };
    
    room.gameState = 'playing';
    room.currentRound = 1;
    room.scores = { host: 0, guest: 0 };
    return { success: true, room };
  }

  // Make a choice for a round
  makeChoice(roomCode, socketId, choice) {
    const room = this.rooms.get(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.gameState !== 'playing') {
      return { success: false, error: 'Game is not in playing state' };
    }

    const validChoices = ['rock', 'paper', 'scissors'];
    if (!validChoices.includes(choice)) {
      return { success: false, error: 'Invalid choice' };
    }

    if (room.host.socketId === socketId) {
      room.choices.host = choice;
    } else if (room.guest && room.guest.socketId === socketId) {
      room.choices.guest = choice;
    } else {
      return { success: false, error: 'Player not in room' };
    }

    // Check if both players have made choices
    const bothChosen = room.choices.host !== null && room.choices.guest !== null;
    return { success: true, bothChosen, room };
  }

  // Determine winner of a round
  determineRoundWinner(hostChoice, guestChoice) {
    // null means timeout
    if (!hostChoice && !guestChoice) return 'tie'; // Both timeout, no points
    if (!hostChoice) return 'guest'; // Host timeout, guest wins
    if (!guestChoice) return 'host'; // Guest timeout, host wins

    if (hostChoice === guestChoice) return 'tie';

    const winConditions = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    if (winConditions[hostChoice] === guestChoice) {
      return 'host';
    }
    return 'guest';
  }

  // Process end of round
  processRoundEnd(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const winner = this.determineRoundWinner(room.choices.host, room.choices.guest);
    const roundResult = {
      round: room.currentRound,
      hostChoice: room.choices.host,
      guestChoice: room.choices.guest,
      winner,
      scores: { ...room.scores }
    };

    // Update scores
    if (winner === 'host') {
      room.scores.host++;
    } else if (winner === 'guest') {
      room.scores.guest++;
    }
    // If tie (both timeout or same choice), no points awarded

    roundResult.scores = { ...room.scores };

    // Reset choices for next round
    room.choices = { host: null, guest: null };

    // Check if game is over
    if (room.currentRound >= room.totalRounds) {
      room.gameState = 'gameOver';
      roundResult.gameOver = true;
      roundResult.finalWinner = this.determineFinalWinner(room);
    } else {
      room.currentRound++;
    }

    return roundResult;
  }

  // Determine final winner of the game
  determineFinalWinner(room) {
    if (room.scores.host > room.scores.guest) {
      return {
        winner: 'host',
        username: room.host.username,
        userId: room.host.userId,
        loserUserId: room.guest.userId
      };
    } else if (room.scores.guest > room.scores.host) {
      return {
        winner: 'guest',
        username: room.guest.username,
        userId: room.guest.userId,
        loserUserId: room.host.userId
      };
    }
    return { winner: 'tie' };
  }

  // Leave room / disconnect
  leaveRoom(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.host.socketId === socketId) {
        // Host left, destroy room
        this.rooms.delete(code);
        return { roomCode: code, role: 'host', room };
      }
      if (room.guest && room.guest.socketId === socketId) {
        // Guest left
        room.guest = null;
        room.gameState = 'waiting';
        room.choices = { host: null, guest: null };
        return { roomCode: code, role: 'guest', room };
      }
    }
    return null;
  }

  // Clear room timer
  clearRoomTimer(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room && room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
  }

  // Set room timer
  setRoomTimer(roomCode, timer) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.roundTimer = timer;
    }
  }

  // Clean up old rooms (older than 1 hour)
  cleanupOldRooms() {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.createdAt > oneHour) {
        this.clearRoomTimer(code);
        this.rooms.delete(code);
      }
    }
  }
}

module.exports = new GameManager();
