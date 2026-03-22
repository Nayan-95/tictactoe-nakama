"use strict";

/**
 * Zustand Global Store
 * Chosen over React Context for two reasons:
 *   1. No re-render cascades — components subscribe to exact slices they need
 *   2. Built-in devtools support for debugging match state transitions
 * All async logic lives in useNakama — this store is pure synchronous state.
 */

import { create } from "zustand";

export var useGameStore = create(function(set, get) {
  return {
    // Auth
    user:      null,    // { id, username }
    connected: false,

    // Navigation
    screen: "login",    // "login" | "lobby" | "game" | "leaderboard"

    // Match
    matchId:      null,
    gameState:    null,
    gameOver:     null,
    timerPayload: null,
    isSearching:  false,
    inviteCode:   null,

    // Player stats
    stats: { wins: 0, losses: 0, draws: 0 },

    // UI
    toastMessage: null,

    // ── Setters ──────────────────────────────────────────────────────────────
    setUser:         function(user)  { set({ user: user }); },
    setConnected:    function(v)     { set({ connected: v }); },
    setScreen:       function(s)     { set({ screen: s }); },
    setMatchId:      function(id)    { set({ matchId: id }); },
    setGameState:    function(gs)    { set({ gameState: gs }); },
    setGameOver:     function(go)    { set({ gameOver: go }); },
    setTimerPayload: function(t)     { set({ timerPayload: t }); },
    setIsSearching:  function(v)     { set({ isSearching: v }); },
    setInviteCode:   function(code)  { set({ inviteCode: code }); },
    setStats:        function(s)     { set({ stats: s }); },
    showToast:       function(msg)   { set({ toastMessage: msg }); },
    clearToast:      function()      { set({ toastMessage: null }); },

    resetMatchState: function() {
      set({
        matchId:      null,
        gameState:    null,
        gameOver:     null,
        timerPayload: null,
        isSearching:  false,
        inviteCode:   null,
      });
    },
  };
});
