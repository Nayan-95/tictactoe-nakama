"use strict";

var OP_CODE_MOVE = 1;
var OP_CODE_STATE = 2;
var OP_CODE_ERROR = 3;
var OP_CODE_MATCH_OVER = 4;

var TICK_RATE = 1;
var WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function createEmptyBoard() {
  return ["", "", "", "", "", "", "", "", ""];
}

function createMatchState(params) {
  var players = [];
  if (params && params.players && params.players.length) {
    players = params.players.slice(0, 2);
  }

  var marks = {};
  if (players.length > 0) {
    marks[players[0]] = "X";
  }
  if (players.length > 1) {
    marks[players[1]] = "Y";
  }

  return {
    board: createEmptyBoard(),
    currentTurn: players.length > 0 ? players[0] : null,
    players: players,
    presences: [],
    marks: marks,
    status: players.length === 2 ? "playing" : "waiting",
    winner: null,
  };
}

function cloneStateForBroadcast(state) {
  return {
    board: state.board.slice(0),
    currentTurn: state.currentTurn,
    players: state.players.slice(0),
    marks: state.marks,
    status: state.status,
    winner: state.winner,
  };
}

function toJson(value) {
  return JSON.stringify(value);
}

function decodeBase64(input) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var buffer = 0;
  var bits = 0;

  for (var i = 0; i < input.length; i++) {
    var char = input.charAt(i);

    if (char === "=") {
      break;
    }

    var value = chars.indexOf(char);
    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 255);
    }
  }

  return output;
}

function parseMovePayload(nk, rawData) {
  if (nk && typeof nk.binaryToString === "function") {
    try {
      return JSON.parse(nk.binaryToString(rawData));
    } catch (binaryError) {
      // Fall back to string-based parsing for older/runtime-specific payload shapes.
    }
  }

  if (typeof rawData === "string") {
    try {
      return JSON.parse(rawData);
    } catch (jsonError) {
      return JSON.parse(decodeBase64(rawData));
    }
  }

  return JSON.parse(String(rawData));
}

function sendGameState(dispatcher, state, presences) {
  if (!presences || presences.length === 0) {
    return;
  }

  dispatcher.broadcastMessage(OP_CODE_STATE, toJson(cloneStateForBroadcast(state)), presences, null, true);
}

function sendError(dispatcher, presence, message) {
  dispatcher.broadcastMessage(OP_CODE_ERROR, toJson({ message: message }), [presence], null, true);
}

function broadcastMatchOver(dispatcher, presences, winner, reason) {
  if (!presences || presences.length === 0) {
    return;
  }

  dispatcher.broadcastMessage(
    OP_CODE_MATCH_OVER,
    toJson({ winner: winner, reason: reason }),
    presences,
    null,
    true
  );
}

function findPresenceByUserId(presences, userId) {
  for (var i = 0; i < presences.length; i++) {
    if (presences[i].userId === userId) {
      return presences[i];
    }
  }

  return null;
}

function findWinner(board, marks, players) {
  for (var i = 0; i < WINNING_COMBINATIONS.length; i++) {
    var combo = WINNING_COMBINATIONS[i];
    var a = combo[0];
    var b = combo[1];
    var c = combo[2];

    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      for (var p = 0; p < players.length; p++) {
        var userId = players[p];
        if (marks[userId] === board[a]) {
          return userId;
        }
      }
    }
  }

  return null;
}

function isBoardFull(board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === "") {
      return false;
    }
  }

  return true;
}

function normalizeMatchedUsers(entries) {
  var players = [];

  for (var i = 0; i < entries.length; i++) {
    players.push(entries[i].presence.userId);
  }

  return players;
}

function matchmakerMatched(context, logger, nk, entries) {
  if (!entries || entries.length !== 2) {
    logger.warn("Expected exactly 2 matchmaker entries, got %v.", entries ? entries.length : 0);
    return null;
  }

  var playerIds = normalizeMatchedUsers(entries);
  var params = {
    players: playerIds,
  };

  var matchId = nk.matchCreate("tic_tac_toe", params);
  logger.info("Created Tic-Tac-Toe match %v for players %v and %v.", matchId, playerIds[0], playerIds[1]);

  return matchId;
}

// Clients can call this RPC first to enter Nakama's built-in matchmaker queue.
function rpcFindMatch(context, logger, nk, payload) {
  if (!context.userId) {
    throw new Error("User must be authenticated.");
  }

  if (!context.sessionId) {
    throw new Error("rpc_find_match must be called from an active socket session.");
  }

  // Add the caller to Nakama's built-in matchmaker so two players are paired automatically.
  var ticket = nk.matchmakerAdd(context.sessionId, "*", 2, 2, {}, {});
  return toJson({ ticket: ticket });
}

// Every authoritative match gets its own isolated board and player mapping.
function matchInit(context, logger, nk, params) {
  var state = createMatchState(params || {});

  logger.info("Initializing Tic-Tac-Toe match with players: %v", toJson(state.players));

  return {
    state: state,
    tickRate: TICK_RATE,
    label: "tic_tac_toe",
  };
}

function matchJoinAttempt(context, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.players.length >= 2 && state.players.indexOf(presence.userId) === -1) {
    return {
      state: state,
      accept: false,
      rejectMessage: "Match is full.",
    };
  }

  return {
    state: state,
    accept: true,
  };
}

function matchJoin(context, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    var alreadyTracked = false;

    for (var j = 0; j < state.presences.length; j++) {
      if (state.presences[j].userId === presence.userId && state.presences[j].sessionId === presence.sessionId) {
        alreadyTracked = true;
        break;
      }
    }

    if (!alreadyTracked) {
      state.presences.push(presence);
    }

    if (state.players.indexOf(presence.userId) === -1 && state.players.length < 2) {
      state.players.push(presence.userId);
    }
  }

  if (state.players.length > 0 && !state.marks[state.players[0]]) {
    state.marks[state.players[0]] = "X";
  }
  if (state.players.length > 1 && !state.marks[state.players[1]]) {
    state.marks[state.players[1]] = "Y";
  }

  if (state.players.length === 2 && state.status === "waiting") {
    state.status = "playing";
    state.currentTurn = state.players[0];
  }

  sendGameState(dispatcher, state, state.presences);

  return {
    state: state,
  };
}

function matchLeave(context, logger, nk, dispatcher, tick, state, presences) {
  if (state.presences) {
    for (var p = 0; p < presences.length; p++) {
      var nextPresences = [];
      for (var j = 0; j < state.presences.length; j++) {
        if (
          state.presences[j].userId !== presences[p].userId ||
          state.presences[j].sessionId !== presences[p].sessionId
        ) {
          nextPresences.push(state.presences[j]);
        }
      }
      state.presences = nextPresences;
    }
  }

  if (state.status !== "finished" && presences && presences.length > 0) {
    var leavingUserId = presences[0].userId;
    var winner = null;

    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i] !== leavingUserId) {
        winner = state.players[i];
        break;
      }
    }

    state.status = "finished";
    state.winner = winner;

    var remainingPresence = winner ? findPresenceByUserId(state.presences || [], winner) : null;
    if (remainingPresence) {
      sendGameState(dispatcher, state, [remainingPresence]);
      broadcastMatchOver(dispatcher, [remainingPresence], winner, "opponent_left");
    }
  }

  return {
    state: state,
  };
}

function matchLoop(context, logger, nk, dispatcher, tick, state, messages) {
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];

    if (message.opCode !== OP_CODE_MOVE) {
      continue;
    }

    var userId = message.sender.userId;
    var payload;

    try {
      payload = parseMovePayload(nk, message.data);
    } catch (error) {
      logger.error("Failed to parse move payload: %v", message.data);
      sendError(dispatcher, message.sender, "Invalid payload.");
      continue;
    }

    if (!payload || typeof payload.position !== "number") {
      sendError(dispatcher, message.sender, "Position must be a number between 0 and 8.");
      continue;
    }

    var position = payload.position;
    if (position < 0 || position > 8 || position % 1 !== 0) {
      sendError(dispatcher, message.sender, "Position must be an integer between 0 and 8.");
      continue;
    }

    if (state.status !== "playing") {
      sendError(dispatcher, message.sender, "Game is not active.");
      continue;
    }

    if (state.players.indexOf(userId) === -1) {
      sendError(dispatcher, message.sender, "You are not part of this match.");
      continue;
    }

    if (state.currentTurn !== userId) {
      sendError(dispatcher, message.sender, "It is not your turn.");
      continue;
    }

    if (state.board[position] !== "") {
      sendError(dispatcher, message.sender, "That position is already occupied.");
      continue;
    }

    // Apply the move only after all turn/order/state checks pass on the server.
    state.board[position] = state.marks[userId];

    var winner = findWinner(state.board, state.marks, state.players);
    if (winner) {
      state.status = "finished";
      state.winner = winner;
      sendGameState(dispatcher, state, state.presences || []);
      broadcastMatchOver(dispatcher, state.presences || [], winner, "win");
      continue;
    }

    if (isBoardFull(state.board)) {
      state.status = "finished";
      state.winner = null;
      sendGameState(dispatcher, state, state.presences || []);
      broadcastMatchOver(dispatcher, state.presences || [], null, "draw");
      continue;
    }

    state.currentTurn = state.players[0] === userId ? state.players[1] : state.players[0];
    sendGameState(dispatcher, state, state.presences || []);
  }

  return {
    state: state,
  };
}

function matchTerminate(context, logger, nk, dispatcher, tick, state, graceSeconds) {
  if (state.presences && state.presences.length > 0 && state.status !== "finished") {
    broadcastMatchOver(dispatcher, state.presences, state.winner, "opponent_left");
  }

  logger.info("Terminating Tic-Tac-Toe match.");

  return {
    state: state,
  };
}
function matchSignal(context, logger, nk, dispatcher, tick, state, data) {
  logger.debug("Match signal received: %v", data);
  return {
    state: state,
    data: ""
  };
}

function InitModule(context, logger, nk, initializer) {
  initializer.registerRpc("find_match", rpcFindMatch);
  initializer.registerMatchmakerMatched(matchmakerMatched);

  initializer.registerMatch("tic_tac_toe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  logger.info("Tic-Tac-Toe Nakama module loaded.");
}
