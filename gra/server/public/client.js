const socket = io();

const els = {
  screens: {
    start: document.getElementById('screen-start'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game'),
    end: document.getElementById('screen-end'),
  },
  roomBadge: document.getElementById('roomBadge'),
  nameInput: document.getElementById('nameInput'),
  btnCreate: document.getElementById('btnCreate'),
  codeInput: document.getElementById('codeInput'),
  btnJoin: document.getElementById('btnJoin'),
  startError: document.getElementById('startError'),

  lobbyCode: document.getElementById('lobbyCode'),
  lobbyCount: document.getElementById('lobbyCount'),
  lobbyPlayers: document.getElementById('lobbyPlayers'),
  btnStart: document.getElementById('btnStart'),

  blackCardText: document.getElementById('blackCardText'),
  blackCardPick: document.getElementById('blackCardPick'),
  timer: document.getElementById('timer'),
  roundInfo: document.getElementById('roundInfo'),
  scoreList: document.getElementById('scoreList'),
  phaseMessage: document.getElementById('phaseMessage'),

  handArea: document.getElementById('handArea'),
  hand: document.getElementById('hand'),
  btnSubmit: document.getElementById('btnSubmit'),

  judgeArea: document.getElementById('judgeArea'),
  judgeTitle: document.getElementById('judgeTitle'),
  submissionsList: document.getElementById('submissionsList'),

  revealArea: document.getElementById('revealArea'),
  revealTitle: document.getElementById('revealTitle'),
  revealCards: document.getElementById('revealCards'),

  endWinner: document.getElementById('endWinner'),
  endScores: document.getElementById('endScores'),
};

let state = {
  code: null,
  myId: null,
  myHand: [],
  selected: [],
  latestState: null,
  timerInterval: null,
};

function showScreen(name) {
  for (const key of Object.keys(els.screens)) {
    els.screens[key].classList.toggle('hidden', key !== name);
  }
}

function setError(msg) {
  els.startError.textContent = msg;
  els.startError.classList.toggle('hidden', !msg);
}

els.btnCreate.addEventListener('click', () => {
  const name = els.nameInput.value.trim();
  if (!name) return setError('Podaj jakąś ksywkę.');
  setError('');
  socket.emit('create_room', { name }, (res) => {
    if (!res.ok) return setError(res.error || 'Nie udało się stworzyć pokoju.');
    state.code = res.code;
    els.roomBadge.textContent = res.code;
    els.roomBadge.classList.remove('hidden');
  });
});

els.btnJoin.addEventListener('click', () => {
  const name = els.nameInput.value.trim();
  const code = els.codeInput.value.trim().toUpperCase();
  if (!name) return setError('Podaj jakąś ksywkę.');
  if (!code) return setError('Podaj kod pokoju.');
  setError('');
  socket.emit('join_room', { code, name }, (res) => {
    if (!res.ok) return setError(res.error || 'Nie udało się dołączyć.');
    state.code = res.code;
    els.roomBadge.textContent = res.code;
    els.roomBadge.classList.remove('hidden');
  });
});

els.btnStart.addEventListener('click', () => {
  socket.emit('start_game', { code: state.code });
});

els.btnSubmit.addEventListener('click', () => {
  if (!state.latestState || !state.latestState.currentBlack) return;
  const pick = state.latestState.currentBlack.pick;
  if (state.selected.length !== pick) return;
  socket.emit('submit_answer', { code: state.code, cards: state.selected.slice() });
  state.selected = [];
  els.handArea.classList.add('hidden');
  els.phaseMessage.textContent = 'Odpowiedź wysłana. Czekamy na resztę…';
});

socket.on('connect', () => {
  state.myId = socket.id;
});

socket.on('your_hand', ({ hand }) => {
  state.myHand = hand;
  renderHand();
});

socket.on('room_state', (roomState) => {
  state.latestState = roomState;
  state.myId = socket.id;
  render(roomState);
});

socket.on('submissions', ({ entries }) => {
  renderSubmissions(entries);
});

socket.on('round_result', (data) => {
  renderReveal(data);
});

socket.on('game_over', ({ winnerName, players }) => {
  showScreen('end');
  els.endWinner.textContent = `${winnerName} zostaje ostatecznym Dżentelmenem Rundy! 🏆`;
  els.endScores.innerHTML = '';
  players
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(p.name)}</span><span>${p.score} pkt</span>`;
      els.endScores.appendChild(li);
    });
  stopTimer();
});

function render(roomState) {
  const me = roomState.players.find((p) => p.id === state.myId);
  const isHost = me ? me.isHost : false;

  if (roomState.phase === 'lobby') {
    showScreen('lobby');
    els.lobbyCode.textContent = roomState.code;
    els.lobbyCount.textContent = roomState.players.length;
    els.lobbyPlayers.innerHTML = '';
    roomState.players.forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(p.name)}</span>` + (p.isHost ? '<span class="tag">host</span>' : '');
      els.lobbyPlayers.appendChild(li);
    });
    els.btnStart.classList.toggle('hidden', !isHost);
    els.btnStart.disabled = roomState.players.length < 3;
    return;
  }

  if (roomState.phase === 'ended') return;

  showScreen('game');
  const isCzar = me ? me.isCzar : false;

  if (roomState.currentBlack) {
    els.blackCardText.textContent = roomState.currentBlack.text;
    els.blackCardPick.textContent = roomState.currentBlack.pick > 1
      ? `Wybierz ${roomState.currentBlack.pick} karty`
      : 'Wybierz 1 kartę';
  }
  els.roundInfo.textContent = `Runda ${roomState.round} · do ${roomState.scoreLimit} pkt`;

  els.scoreList.innerHTML = '';
  roomState.players
    .slice()
    .sort((a, b) => b.score - a.score)
    .forEach((p) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(p.name)}${p.isCzar ? ' <span class="czar">(sędzia)</span>' : ''}</span><span class="pts">${p.score}</span>`;
      els.scoreList.appendChild(li);
    });

  startTimer(roomState.timerEndsAt);

  els.handArea.classList.add('hidden');
  els.judgeArea.classList.add('hidden');
  els.revealArea.classList.add('hidden');

  if (roomState.phase === 'submitting') {
    if (isCzar) {
      const submitted = roomState.players.filter((p) => !p.isCzar && p.submitted).length;
      const total = roomState.players.filter((p) => !p.isCzar).length;
      els.phaseMessage.textContent = `Jesteś sędzią tej rundy. Czekasz na odpowiedzi (${submitted}/${total})…`;
    } else {
      const me2 = roomState.players.find((p) => p.id === state.myId);
      if (me2 && me2.submitted) {
        els.phaseMessage.textContent = 'Odpowiedź wysłana. Czekamy na resztę…';
      } else {
        els.phaseMessage.textContent = 'Wybierz swoją najlepszą (albo najgorszą) odpowiedź.';
        els.handArea.classList.remove('hidden');
        renderHand();
      }
    }
  } else if (roomState.phase === 'judging') {
    if (isCzar) {
      els.phaseMessage.textContent = 'Wybierz zwycięską odpowiedź.';
    } else {
      els.phaseMessage.textContent = 'Sędzia ocenia odpowiedzi…';
    }
    els.judgeArea.classList.remove('hidden');
  } else if (roomState.phase === 'reveal') {
    els.phaseMessage.textContent = 'Wyniki rundy:';
    els.revealArea.classList.remove('hidden');
  }
}

function renderHand() {
  if (els.handArea.classList.contains('hidden')) return;
  const pick = state.latestState && state.latestState.currentBlack ? state.latestState.currentBlack.pick : 1;
  els.hand.innerHTML = '';
  state.myHand.forEach((cardText) => {
    const div = document.createElement('div');
    div.className = 'white-card';
    div.textContent = cardText;
    if (state.selected.includes(cardText)) div.classList.add('selected');
    div.addEventListener('click', () => {
      const idx = state.selected.indexOf(cardText);
      if (idx >= 0) {
        state.selected.splice(idx, 1);
      } else {
        if (state.selected.length >= pick) state.selected.shift();
        state.selected.push(cardText);
      }
      renderHand();
      els.btnSubmit.disabled = state.selected.length !== pick;
    });
    els.hand.appendChild(div);
  });
  els.btnSubmit.disabled = state.selected.length !== pick;
}

function renderSubmissions(entries) {
  const me = state.latestState ? state.latestState.players.find((p) => p.id === state.myId) : null;
  const isCzar = me ? me.isCzar : false;
  els.judgeTitle.textContent = isCzar ? 'Wybierz zwycięzcę' : 'Zgłoszenia (sędzia ocenia)';
  els.submissionsList.innerHTML = '';
  entries.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'submission-group' + (isCzar ? '' : ' not-clickable');
    entry.cards.forEach((c) => {
      const p = document.createElement('div');
      p.textContent = c;
      div.appendChild(p);
    });
    if (isCzar) {
      div.addEventListener('click', () => {
        socket.emit('czar_pick', { code: state.code, submissionIndex: entry.index });
      });
    }
    els.submissionsList.appendChild(div);
  });
}

function renderReveal(data) {
  els.revealTitle.textContent = `🏆 Zwycięzca rundy: ${data.winnerName}`;
  els.revealCards.innerHTML = '';
  data.entries.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'submission-group not-clickable' + (entry.index === data.winnerIndex ? ' winner' : '');
    entry.cards.forEach((c) => {
      const p = document.createElement('div');
      p.textContent = c;
      div.appendChild(p);
    });
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = entry.playerName;
    div.appendChild(who);
    els.revealCards.appendChild(div);
  });
}

function startTimer(endsAt) {
  stopTimer();
  if (!endsAt) {
    els.timer.textContent = '--';
    return;
  }
  const tick = () => {
    const secs = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    els.timer.textContent = secs + 's';
  };
  tick();
  state.timerInterval = setInterval(tick, 250);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
