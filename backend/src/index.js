"use strict";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

var MODULE_NAME  = "tictactoe";
var AI_PLAYER_ID = "ai-bot-system";
var AI_USERNAME  = "NeonBot";
var TURN_SECONDS = 30;

var Op = { MOVE: 1, STATE: 2, GAME_OVER: 3, TICK: 4, READY: 5 };

var WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8],   // rows
  [0,3,6], [1,4,7], [2,5,8],   // columns
  [0,4,8], [2,4,6],            // diagonals
];

// ────────────────────────────────────────────────────────────────────────────
// Pure Helper Functions (no Nakama API calls, no side effects)
// ────────────────────────────────────────────────────────────────────────────

function getWinLine(board) {
  for (var i = 0; i < WIN_LINES.length; i++) {
    var a = WIN_LINES[i][0], b = WIN_LINES[i][1], c = WIN_LINES[i][2];
    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return WIN_LINES[i];
    }
  }
  return null;
}

function checkWinner(board) {
  var line = getWinLine(board);
  return line ? board[line[0]] : null;
}

function isBoardFull(board) {
  for (var i = 0; i < 9; i++) {
    if (board[i] === "") return false;
  }
  return true;
}

function minimax(board, isMaximizing, aiMark, humanMark, depth) {
  var winner = checkWinner(board);
  if (winner === aiMark)    return 10 - depth;
  if (winner === humanMark) return depth - 10;
  if (isBoardFull(board))  return 0;

  var best = isMaximizing ? -100 : 100;
  for (var i = 0; i < 9; i++) {
    if (board[i] !== "") continue;
    board[i] = isMaximizing ? aiMark : humanMark;
    var score = minimax(board, !isMaximizing, aiMark, humanMark, depth + 1);
    board[i] = "";
    if (isMaximizing) { if (score > best) best = score; }
    else              { if (score < best) best = score; }
  }
  return best;
}

function minimaxBestMove(board, aiMark, humanMark) {
  var bestScore = -100;
  var bestPos   = -1;
  for (var i = 0; i < 9; i++) {
    if (board[i] !== "") continue;
    board[i] = aiMark;
    var score = minimax(board, false, aiMark, humanMark, 0);
    board[i] = "";
    if (score > bestScore) { bestScore = score; bestPos = i; }
  }
  return bestPos;
}

function generateInviteCode(length) {
  var chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var result = "";
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function tryParseJson(raw) {
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function parseMovePayload(nk, rawData) {
  if (nk && typeof nk.binaryToString === "function") {
    try { return JSON.parse(nk.binaryToString(rawData)); } catch (e) {}
  }
  if (typeof rawData === "string") {
    try { return JSON.parse(rawData); } catch (e) {}
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// State Factory
// ────────────────────────────────────────────────────────────────────────────

function createMatchState(inviteCode, isAiMatch) {
  return {
    board:      ["","","","","","","","",""],
    marks:      {},
    playerInfo: {},
    players:    [],
    presences:  {},
    turn:       "",
    turnTimer:  TURN_SECONDS,
    winner:     null,
    winLine:    null,
    isDraw:     false,
    gameOver:   false,
    isAiMatch:  !!isAiMatch,
    inviteCode: inviteCode || null,
  };
}

function buildStatePayload(state) {
  return JSON.stringify({
    board:      state.board,
    marks:      state.marks,
    playerInfo: state.playerInfo,
    players:    state.players,
    turn:       state.turn,
    turnTimer:  state.turnTimer,
    gameOver:   state.gameOver,
    isAiMatch:  state.isAiMatch,
  });
}

function buildGameOverPayload(state, reason) {
  return JSON.stringify({
    winner:     state.winner,
    winnerMark: state.winner ? (state.marks[state.winner] || "") : "",
    reason:     reason,
    board:      state.board,
    winLine:    state.winLine,
    playerInfo: state.playerInfo,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Leaderboard Write Helper
// ────────────────────────────────────────────────────────────────────────────

function writeMatchResult(nk, logger, winnerId, loserId, isDraw, players) {
  try {
    if (isDraw) {
      for (var i = 0; i < players.length; i++) {
        if (players[i] !== AI_PLAYER_ID) {
          nk.leaderboardRecordWrite("ttt_draws", players[i], "", 1, 0, {});
        }
      }
      return;
    }
    if (winnerId && winnerId !== AI_PLAYER_ID) {
      nk.leaderboardRecordWrite("ttt_wins", winnerId, "", 1, 0, {});
    }
    if (loserId && loserId !== AI_PLAYER_ID) {
      nk.leaderboardRecordWrite("ttt_losses", loserId, "", 1, 0, {});
    }
  } catch (e) {
    logger.error("Leaderboard write failed: " + e);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Game-Over Handler
// ────────────────────────────────────────────────────────────────────────────

function resolveGameOver(state, dispatcher, nk, logger, reason) {
  state.gameOver = true;
  state.winLine  = state.winner ? getWinLine(state.board) : null;

  var playerIds = state.players;
  var loserId   = state.winner
    ? playerIds.filter(function(p) { return p !== state.winner; })[0] || ""
    : "";

  writeMatchResult(nk, logger, state.winner, loserId, state.isDraw, playerIds);

  var presenceList = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
  if (presenceList.length > 0) {
    dispatcher.broadcastMessage(Op.GAME_OVER, buildGameOverPayload(state, reason), presenceList, null, true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Match Handler Functions
// ────────────────────────────────────────────────────────────────────────────

function matchInit(context, logger, nk, params) {
  var inviteCode = (params && params.inviteCode) ? params.inviteCode : null;
  var isAiMatch  = !!(params && params.isAiMatch);
  var state      = createMatchState(inviteCode, isAiMatch);

  logger.info("Match initialized. AI=" + isAiMatch + " Code=" + inviteCode);
  return { state: state, tickRate: 1, label: MODULE_NAME };
}

function matchJoinAttempt(context, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2 && state.players.indexOf(presence.userId) === -1) {
    return { state: state, accept: false, rejectMessage: "Match is full." };
  }
  return { state: state, accept: true };
}

function matchJoin(context, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    if (state.players.indexOf(p.userId) === -1) {
      state.players.push(p.userId);
      state.playerInfo[p.userId] = p.username || ("Player " + state.players.length);
    }
    state.presences[p.userId] = p;
    logger.info("Player joined: " + p.userId + " (" + p.username + ")");
  }

  // Assign marks when 2 real players are present
  if (state.players.length === 2 && !state.marks[state.players[0]]) {
    state.marks[state.players[0]] = "X";
    state.marks[state.players[1]] = "O";
    state.turn      = state.players[0];
    state.turnTimer = TURN_SECONDS;

    var presenceList = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
    dispatcher.broadcastMessage(Op.STATE, buildStatePayload(state), presenceList, null, true);
    logger.info("Game started. X=" + state.players[0] + " O=" + state.players[1]);
  }

  return { state: state };
}

function matchLeave(context, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var leaverId = presences[i].userId;
    logger.info("Player left: " + leaverId);
    delete state.presences[leaverId];

    if (!state.gameOver && state.players.length === 2) {
      state.winner = state.players.filter(function(p) { return p !== leaverId; })[0] || null;
      resolveGameOver(state, dispatcher, nk, logger, "opponent_left");
    }

    state.players = state.players.filter(function(p) { return p !== leaverId; });
  }

  return { state: state };
}

/**
 * Server-Authoritative Core:
 * ALL game state transitions happen here — never on the client.
 * The client is a dumb renderer: it sends only a position index (0-8).
 * Every move is validated server-side before being applied.
 * Clients cannot manipulate board state, turn order, or scores.
 */
function matchLoop(context, logger, nk, dispatcher, tick, state, messages) {
  // Terminate finished matches (frees Nakama resources)
  if (state.gameOver) return null;

  // Wait silently for a second player
  if (state.players.length < 2) {
    // AI match: inject the bot after 1 tick if only 1 human is present
    if (state.isAiMatch && state.players.length === 1 && tick === 1) {
      state.players.push(AI_PLAYER_ID);
      state.playerInfo[AI_PLAYER_ID] = AI_USERNAME;
      state.marks[state.players[0]] = "X";
      state.marks[AI_PLAYER_ID]     = "O";
      state.turn      = state.players[0]; // human goes first
      state.turnTimer = TURN_SECONDS;

      var aiJoinPresences = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
      dispatcher.broadcastMessage(Op.STATE, buildStatePayload(state), aiJoinPresences, null, true);
      logger.info("AI bot injected into match.");
    }
    return { state: state };
  }

  // ── Process incoming player moves ─────────────────────────────────────────
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (msg.opCode !== Op.MOVE) continue;

    var senderId = msg.sender.userId;

    // Server-authoritative: validate turn ownership
    if (senderId !== state.turn) {
      logger.warn("Out-of-turn move rejected from: " + senderId);
      continue;
    }

    var data = parseMovePayload(nk, msg.data);
    if (!data || typeof data.position !== "number") {
      logger.warn("Invalid move payload from: " + senderId);
      continue;
    }

    var pos = data.position;

    // Server-authoritative: validate position bounds and empty cell
    if (pos < 0 || pos > 8 || pos % 1 !== 0 || state.board[pos] !== "") {
      logger.warn("Invalid position " + pos + " from: " + senderId);
      continue;
    }

    // Apply move
    state.board[pos] = state.marks[senderId];
    state.turnTimer  = TURN_SECONDS;

    var winMark = checkWinner(state.board);
    if (winMark) {
      state.winner = Object.keys(state.marks).filter(function(id) {
        return state.marks[id] === winMark;
      })[0] || null;
      resolveGameOver(state, dispatcher, nk, logger, "win");
      return null;
    }

    if (isBoardFull(state.board)) {
      state.isDraw = true;
      resolveGameOver(state, dispatcher, nk, logger, "draw");
      return null;
    }

    // Switch turn
    state.turn = state.players.filter(function(p) { return p !== senderId; })[0] || "";
    var pl = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
    dispatcher.broadcastMessage(Op.STATE, buildStatePayload(state), pl, null, true);
  }

  // ── AI move (fires 1 tick after it becomes the AI's turn) ─────────────────
  if (state.isAiMatch && state.turn === AI_PLAYER_ID && !state.gameOver) {
    // 1-tick delay so the human's move visually lands before the AI responds
    if (state.turnTimer === TURN_SECONDS - 1) {
      var humanId   = state.players.filter(function(p) { return p !== AI_PLAYER_ID; })[0];
      var aiMark    = state.marks[AI_PLAYER_ID];
      var humanMark = state.marks[humanId];
      var bestPos   = minimaxBestMove(state.board.slice(), aiMark, humanMark);

      if (bestPos !== -1) {
        state.board[bestPos] = aiMark;
        state.turnTimer      = TURN_SECONDS;

        var winMarkAi = checkWinner(state.board);
        if (winMarkAi) {
          state.winner = AI_PLAYER_ID;
          resolveGameOver(state, dispatcher, nk, logger, "win");
          return null;
        }
        if (isBoardFull(state.board)) {
          state.isDraw = true;
          resolveGameOver(state, dispatcher, nk, logger, "draw");
          return null;
        }

        state.turn = humanId;
        var pl2 = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
        dispatcher.broadcastMessage(Op.STATE, buildStatePayload(state), pl2, null, true);
      }
    }
  }

  // ── Turn timer countdown (runs every tick = every second) ─────────────────
  if (state.turn && state.players.length === 2 && !state.gameOver) {
    state.turnTimer--;

    var pl3 = Object.keys(state.presences).map(function(k) { return state.presences[k]; });
    if (pl3.length > 0) {
      dispatcher.broadcastMessage(Op.TICK, JSON.stringify({
        turn:     state.turn,
        timeLeft: state.turnTimer,
      }), pl3, null, true);
    }

    if (state.turnTimer <= 0) {
      // The player whose turn it is loses on timeout
      var timerId = state.turn;
      state.winner = state.players.filter(function(p) { return p !== timerId; })[0] || null;
      resolveGameOver(state, dispatcher, nk, logger, "timeout");
      return null;
    }
  }

  return { state: state };
}

function matchTerminate(context, logger, nk, dispatcher, tick, state, graceSeconds) {
  logger.info("Match terminating. Grace seconds: " + graceSeconds);
  return { state: state };
}

function matchSignal(context, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: "" };
}

// ────────────────────────────────────────────────────────────────────────────
// RPC Functions
// ────────────────────────────────────────────────────────────────────────────

function rpcCreateMatch(context, logger, nk, payload) {
  var matchId = nk.matchCreate(MODULE_NAME, {});
  logger.info("Match created: " + matchId);
  return JSON.stringify({ matchId: matchId });
}

// Finds an open public match (fewer than 2 players) or creates a fresh one.
function rpcFindMatch(context, logger, nk, payload) {
  try {
    var matches = nk.matchList(10, true, MODULE_NAME, null, 1, "");
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].size < 2) {
        logger.info("Found open match: " + matches[i].matchId);
        return JSON.stringify({ matchId: matches[i].matchId });
      }
    }
  } catch (e) {
    logger.warn("matchList error: " + e);
  }
  var matchId = nk.matchCreate(MODULE_NAME, {});
  logger.info("Created new match via rpcFindMatch: " + matchId);
  return JSON.stringify({ matchId: matchId });
}

// Creates a private match and stores the invite code in Nakama storage.
// Uses userId "" (system) so any user can read the record by code.
function rpcCreatePrivateMatch(context, logger, nk, payload) {
  var code    = generateInviteCode(6);
  var matchId = nk.matchCreate(MODULE_NAME, { inviteCode: code });

  nk.storageWrite([{
    collection:      "private_matches",
    key:             code,
    userId:          "",           // system record — readable by anyone who knows the key
    value:           { matchId: matchId },
    permissionRead:  2,            // public read
    permissionWrite: 1,            // owner write
  }]);

  logger.info("Private match created. Code=" + code + " Match=" + matchId);
  return JSON.stringify({ matchId: matchId, inviteCode: code });
}

function rpcJoinByCode(context, logger, nk, payload) {
  var data = tryParseJson(payload);
  if (!data || !data.code) {
    return JSON.stringify({ error: "Missing invite code." });
  }

  var code = data.code.toUpperCase().trim();
  try {
    var records = nk.storageRead([{
      collection: "private_matches",
      key:        code,
      userId:     "",   // matches the system-level write in rpcCreatePrivateMatch
    }]);

    if (!records || records.length === 0) {
      return JSON.stringify({ error: "Invalid or expired invite code." });
    }

    var matchId = records[0].value && records[0].value.matchId;
    if (!matchId) return JSON.stringify({ error: "Match not found for this code." });

    logger.info("Join by code " + code + " -> " + matchId);
    return JSON.stringify({ matchId: matchId });
  } catch (e) {
    logger.error("rpcJoinByCode error: " + e);
    return JSON.stringify({ error: "Invalid or expired invite code." });
  }
}

function rpcCreateAiMatch(context, logger, nk, payload) {
  var matchId = nk.matchCreate(MODULE_NAME, { isAiMatch: true });
  logger.info("AI match created: " + matchId);
  return JSON.stringify({ matchId: matchId });
}

function rpcGetLeaderboard(context, logger, nk, payload) {
  try {
    var result  = nk.leaderboardRecordsList("ttt_wins", [], 10, null, 0);
    var records = (result.records || []).map(function(r) {
      return {
        ownerId:  r.ownerId,
        username: r.username || "Unknown",
        score:    r.score    || 0,
        rank:     r.rank     || 0,
      };
    });
    return JSON.stringify({ records: records });
  } catch (e) {
    logger.error("rpcGetLeaderboard error: " + e);
    return JSON.stringify({ records: [] });
  }
}

function rpcGetMyStats(context, logger, nk, payload) {
  var stats  = { wins: 0, losses: 0, draws: 0 };
  var userId = context.userId;

  var boards = [
    { name: "ttt_wins",   key: "wins"   },
    { name: "ttt_losses", key: "losses" },
    { name: "ttt_draws",  key: "draws"  },
  ];

  for (var i = 0; i < boards.length; i++) {
    try {
      var result = nk.leaderboardRecordsList(boards[i].name, [userId], 1, null, 0);
      if (result.ownerRecords && result.ownerRecords.length > 0) {
        stats[boards[i].key] = result.ownerRecords[0].score || 0;
      }
    } catch (e) {
      logger.warn("Stats fetch failed for " + boards[i].name + ": " + e);
    }
  }

  return JSON.stringify(stats);
}

// ────────────────────────────────────────────────────────────────────────────
// InitModule — Entry point called by Nakama on load
// ────────────────────────────────────────────────────────────────────────────

function InitModule(context, logger, nk, initializer) {
  // Create leaderboards (idempotent — safe to re-run on restart)
  var leaderboards = ["ttt_wins", "ttt_losses", "ttt_draws"];
  for (var i = 0; i < leaderboards.length; i++) {
    try {
      nk.leaderboardCreate(leaderboards[i], false, "desc", "incr", "", false);
      logger.info("Leaderboard ready: " + leaderboards[i]);
    } catch (e) {
      logger.info("Leaderboard already exists: " + leaderboards[i]);
    }
  }

  // Register all RPC endpoints
  initializer.registerRpc("rpc_create_match",         rpcCreateMatch);
  initializer.registerRpc("rpc_find_match",           rpcFindMatch);
  initializer.registerRpc("rpc_create_private_match", rpcCreatePrivateMatch);
  initializer.registerRpc("rpc_join_by_code",         rpcJoinByCode);
  initializer.registerRpc("rpc_create_ai_match",      rpcCreateAiMatch);
  initializer.registerRpc("rpc_get_leaderboard",      rpcGetLeaderboard);
  initializer.registerRpc("rpc_get_my_stats",         rpcGetMyStats);

  // Register the authoritative match handler
  initializer.registerMatch(MODULE_NAME, {
    matchInit:        matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin:        matchJoin,
    matchLeave:       matchLeave,
    matchLoop:        matchLoop,
    matchTerminate:   matchTerminate,
    matchSignal:      matchSignal,
  });

  logger.info("Tictactoe module loaded successfully.");
}
