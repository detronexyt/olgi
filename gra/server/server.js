const path = require('path');
const fs = require('fs');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const CZARNE = JSON.parse(fs.readFileSync(path.join(__dirname, 'cards', 'czarne.json'), 'utf8'));
const BIALE = JSON.parse(fs.readFileSync(path.join(__dirname, 'cards', 'biale.json'), 'utf8'));

const HAND_SIZE = 7;
const SCORE_LIMIT = 7;
const SUBMIT_MS = 90 * 1000;
const JUDGE_MS = 60 * 1000;
const REVEAL_MS = 8 * 1000;
const MIN_PLAYERS = 3;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const httpServer = createServer(app);
const io = new Server(httpServer);

/** @type {Map<string, Room>} */
const rooms = new Map();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function newRoom(code, hostId) {
  return {
    code,
    hostId,
    players: new Map(),
    phase: 'lobby',
    blackDeck: shuffle(CZARNE),
    blackDiscard: [],
    whiteDeck: shuffle(BIALE),
    whiteDiscard: [],
    currentBlack: null,
    czarOrder: [],
    czarIndex: -1,
    submissions: new Map(),
    round: 0,
    timer: null,
    timerEndsAt: null,
  };
}

function drawBlack(room) {
  if (room.blackDeck.length === 0) {
    room.blackDeck = shuffle(room.blackDiscard);
    room.blackDiscard = [];
  }
  const card = room.blackDeck.pop();
  room.blackDiscard.push(card);
  return card;
}

function drawWhite(room) {
  if (room.whiteDeck.length === 0) {
    room.whiteDeck = shuffle(room.whiteDiscard);
    room.whiteDiscard = [];
  }
  const card = room.whiteDeck.pop();
  if (card !== undefined) room.whiteDiscard.push(card);
  return card;
}

function refillHand(room, player) {
  while (player.hand.length < HAND_SIZE) {
    const card = drawWhite(room);
    if (card === undefined) break;
    player.hand.push(card);
  }
}

function activePlayers(room) {
  return Array.from(room.players.values()).filter((p) => p.connected);
}

function currentCzar(room) {
  if (room.czarOrder.length === 0) return null;
  const id = room.czarOrder[room.czarIndex % room.czarOrder.length];
  return room.players.get(id) || null;
}

function publicPlayers(room) {
  const czar = currentCzar(room);
  return activePlayers(room).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    isCzar: czar ? p.id === czar.id : false,
    isHost: p.id === room.hostId,
    submitted: room.submissions.has(p.id),
    handCount: p.hand.length,
  }));
}

function baseState(room) {
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    scoreLimit: SCORE_LIMIT,
    players: publicPlayers(room),
    currentBlack: room.currentBlack,
    timerEndsAt: room.timerEndsAt,
  };
}

function emitRoomState(room) {
  io.to(room.code).emit('room_state', baseState(room));
  for (const p of activePlayers(room)) {
    io.to(p.socketId).emit('your_hand', { hand: p.hand });
  }
}

function clearTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  room.timerEndsAt = null;
}

function startSubmitPhase(room) {
  clearTimer(room);
  room.phase = 'submitting';
  room.submissions = new Map();
  room.currentBlack = drawBlack(room);
  room.timerEndsAt = Date.now() + SUBMIT_MS;
  room.timer = setTimeout(() => autoSubmitAndAdvance(room), SUBMIT_MS);
  emitRoomState(room);
}

function autoSubmitAndAdvance(room) {
  const czar = currentCzar(room);
  const pick = room.currentBlack.pick;
  for (const p of activePlayers(room)) {
    if (czar && p.id === czar.id) continue;
    if (!room.submissions.has(p.id)) {
      const n = Math.min(pick, p.hand.length);
      const cards = p.hand.splice(0, n);
      room.submissions.set(p.id, cards);
    }
  }
  moveToJudging(room);
}

function moveToJudging(room) {
  clearTimer(room);
  room.phase = 'judging';
  room.timerEndsAt = Date.now() + JUDGE_MS;
  room.timer = setTimeout(() => autoJudgeAndReveal(room), JUDGE_MS);
  io.to(room.code).emit('room_state', baseState(room));
  const order = shuffle(Array.from(room.submissions.keys()));
  room.judgeOrder = order;
  const anon = order.map((pid, idx) => ({ index: idx, cards: room.submissions.get(pid) }));
  io.to(room.code).emit('submissions', { entries: anon });
}

function autoJudgeAndReveal(room) {
  if (!room.judgeOrder || room.judgeOrder.length === 0) return;
  const idx = Math.floor(Math.random() * room.judgeOrder.length);
  revealWinner(room, idx);
}

function revealWinner(room, submissionIndex) {
  clearTimer(room);
  const winnerId = room.judgeOrder[submissionIndex];
  if (!winnerId) return;
  const winner = room.players.get(winnerId);
  if (winner) winner.score += 1;

  room.phase = 'reveal';
  const entries = room.judgeOrder.map((pid, idx) => ({
    index: idx,
    cards: room.submissions.get(pid),
    playerName: room.players.get(pid) ? room.players.get(pid).name : '???',
  }));
  io.to(room.code).emit('round_result', {
    winnerIndex: submissionIndex,
    winnerName: winner ? winner.name : '???',
    entries,
    players: publicPlayers(room),
  });

  for (const p of activePlayers(room)) refillHand(room, p);

  const gameWinner = activePlayers(room).find((p) => p.score >= SCORE_LIMIT);
  if (gameWinner) {
    room.phase = 'ended';
    io.to(room.code).emit('game_over', { winnerName: gameWinner.name, players: publicPlayers(room) });
    emitRoomState(room);
    return;
  }

  room.timerEndsAt = Date.now() + REVEAL_MS;
  room.timer = setTimeout(() => nextRound(room), REVEAL_MS);
  emitRoomState(room);
}

function nextRound(room) {
  clearTimer(room);
  if (room.czarOrder.length === 0) return;
  room.czarIndex = (room.czarIndex + 1) % room.czarOrder.length;
  room.round += 1;
  startSubmitPhase(room);
}

function removePlayerFromRotationIfCzar(room, playerId) {
  const czar = currentCzar(room);
  if (czar && czar.id === playerId && room.phase === 'submitting') {
    autoSubmitAndAdvance(room);
  } else if (czar && czar.id === playerId && room.phase === 'judging') {
    if (room.judgeOrder && room.judgeOrder.length > 0) {
      revealWinner(room, Math.floor(Math.random() * room.judgeOrder.length));
    }
  }
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ name }, cb) => {
    const code = makeRoomCode();
    const room = newRoom(code, socket.id);
    rooms.set(code, room);
    joinRoomInternal(room, socket, name);
    cb && cb({ ok: true, code });
  });

  socket.on('join_room', ({ code, name }, cb) => {
    const room = rooms.get((code || '').toUpperCase());
    if (!room) return cb && cb({ ok: false, error: 'Nie znaleziono pokoju o takim kodzie.' });
    if (room.phase === 'ended') return cb && cb({ ok: false, error: 'Ta gra już się zakończyła.' });
    joinRoomInternal(room, socket, name);
    cb && cb({ ok: true, code: room.code });
  });

  socket.on('start_game', ({ code }) => {
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId) return;
    if (room.phase !== 'lobby') return;
    const players = activePlayers(room);
    if (players.length < MIN_PLAYERS) return;
    for (const p of players) {
      p.hand = [];
      refillHand(room, p);
      p.score = 0;
    }
    room.czarOrder = players.map((p) => p.id);
    room.czarIndex = 0;
    room.round = 1;
    startSubmitPhase(room);
  });

  socket.on('submit_answer', ({ code, cards }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'submitting') return;
    const player = room.players.get(socket.id);
    if (!player || !player.connected) return;
    const czar = currentCzar(room);
    if (czar && czar.id === socket.id) return;
    if (room.submissions.has(socket.id)) return;
    const pick = room.currentBlack.pick;
    if (!Array.isArray(cards) || cards.length !== pick) return;
    for (const c of cards) {
      if (!player.hand.includes(c)) return;
    }
    for (const c of cards) {
      const idx = player.hand.indexOf(c);
      player.hand.splice(idx, 1);
    }
    room.submissions.set(socket.id, cards);
    io.to(socket.id).emit('your_hand', { hand: player.hand });

    const expected = activePlayers(room).filter((p) => !czar || p.id !== czar.id).length;
    io.to(room.code).emit('room_state', baseState(room));
    if (room.submissions.size >= expected) {
      moveToJudging(room);
    }
  });

  socket.on('czar_pick', ({ code, submissionIndex }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'judging') return;
    const czar = currentCzar(room);
    if (!czar || czar.id !== socket.id) return;
    revealWinner(room, submissionIndex);
  });

  socket.on('leave_room', ({ code }) => {
    handleLeave(socket, code);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      if (room.players.has(socket.id)) {
        handleLeave(socket, room.code);
      }
    }
  });

  function handleLeave(socket, code) {
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.connected = false;
    socket.leave(code);
    room.czarOrder = room.czarOrder.filter((id) => id !== socket.id || room.phase === 'lobby');
    if (room.hostId === socket.id) {
      const next = activePlayers(room)[0];
      room.hostId = next ? next.id : null;
    }
    if (room.phase === 'submitting' || room.phase === 'judging') {
      removePlayerFromRotationIfCzar(room, socket.id);
    }
    if (activePlayers(room).length === 0) {
      clearTimer(room);
      rooms.delete(room.code);
      return;
    }
    emitRoomState(room);
  }
});

function joinRoomInternal(room, socket, name) {
  const cleanName = (name || 'Gość').toString().trim().slice(0, 20) || 'Gość';
  room.players.set(socket.id, {
    id: socket.id,
    socketId: socket.id,
    name: cleanName,
    score: 0,
    hand: [],
    connected: true,
  });
  if (room.phase !== 'lobby' && room.phase !== 'ended') {
    refillHand(room, room.players.get(socket.id));
    if (!room.czarOrder.includes(socket.id)) room.czarOrder.push(socket.id);
  }
  socket.join(room.code);
  emitRoomState(room);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Karty dżentelmenów działają na porcie ${PORT}`);
});
