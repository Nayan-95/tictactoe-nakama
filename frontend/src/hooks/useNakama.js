"use strict";

/**
 * Orchestration Hook (holds zero internal state).
 * Composes: NakamaService (I/O) + useGameStore (state mutations).
 * Pattern: unidirectional data flow — screens call actions,
 * store reacts, components re-render from store subscriptions.
 */

import { useRef, useEffect, useCallback } from "react";
import { NakamaService } from "../services/NakamaService.js";
import { useGameStore }   from "../store/useGameStore.js";
import { OpCode }          from "../types/game.js";

export function useNakama() {
  var serviceRef = useRef(null);
  var store      = useGameStore();

  // Initialize the NakamaService singleton once on mount
  useEffect(function() {
    var host = import.meta.env.VITE_NAKAMA_HOST || "localhost";
    var ssl  = host !== "localhost";
    var port = import.meta.env.VITE_NAKAMA_PORT || (ssl ? "443" : "7350");
    var key  = import.meta.env.VITE_NAKAMA_KEY  || "defaultkey";
    serviceRef.current = new NakamaService(host, port, ssl, key);
    return function() {
      if (serviceRef.current) serviceRef.current.disconnect();
    };
  }, []);

  // Routes incoming op codes to the appropriate store mutations
  var handleMatchData = useCallback(function(opCode, raw) {
    try {
      var data = JSON.parse(raw);
      if (opCode === OpCode.STATE) {
        store.setGameState(data);
        store.setTimerPayload({ turn: data.turn, timeLeft: data.turnTimer });
      } else if (opCode === OpCode.GAME_OVER) {
        store.setGameOver(data);
        var current = useGameStore.getState().gameState;
        if (current) {
          store.setGameState(Object.assign({}, current, { gameOver: true, board: data.board }));
        }
      } else if (opCode === OpCode.TICK) {
        store.setTimerPayload(data);
      }
    } catch (e) {
      console.warn("Match data parse error:", e);
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  var login = useCallback(async function(username) {
    try {
      var svc     = serviceRef.current;
      var session = await svc.authenticate(username);
      await svc.connectSocket(session, {
        onMatchData:  handleMatchData,
        onDisconnect: function() {
          store.setConnected(false);
          store.showToast("Disconnected. Please refresh.");
        },
        onError: function() {
          store.showToast("Connection error. Please try again.");
        },
      });
      store.setUser({ id: session.user_id, username: session.username });
      store.setConnected(true);
      store.setScreen("lobby");
    } catch (e) {
      store.showToast((e && e.message) || "Login failed.");
      throw e;
    }
  }, [handleMatchData]);

  var logout = useCallback(function() {
    if (serviceRef.current) serviceRef.current.disconnect();
    store.setUser(null);
    store.setConnected(false);
    store.resetMatchState();
    store.setScreen("login");
  }, []);

  var findMatch = useCallback(async function() {
    store.setIsSearching(true);
    store.resetMatchState();
    try {
      var res   = await serviceRef.current.callRpc("rpc_find_match", {});
      var match = await serviceRef.current.joinMatch(res.matchId);
      store.setMatchId(match.match_id);
      store.setScreen("game");
    } catch (e) {
      store.showToast((e && e.message) || "Could not find a match.");
    } finally {
      store.setIsSearching(false);
    }
  }, []);

  var createPrivateMatch = useCallback(async function() {
    store.setIsSearching(true);
    store.resetMatchState();
    try {
      var res   = await serviceRef.current.callRpc("rpc_create_private_match", {});
      var match = await serviceRef.current.joinMatch(res.matchId);
      store.setMatchId(match.match_id);
      store.setInviteCode(res.inviteCode);
      store.setScreen("game");
    } catch (e) {
      store.showToast((e && e.message) || "Could not create private match.");
    } finally {
      store.setIsSearching(false);
    }
  }, []);

  var joinByCode = useCallback(async function(code) {
    store.setIsSearching(true);
    store.resetMatchState();
    try {
      var res = await serviceRef.current.callRpc("rpc_join_by_code", { code: code });
      if (res.error) throw new Error(res.error);
      var match = await serviceRef.current.joinMatch(res.matchId);
      store.setMatchId(match.match_id);
      store.setScreen("game");
    } catch (e) {
      store.showToast((e && e.message) || "Invalid or expired code.");
    } finally {
      store.setIsSearching(false);
    }
  }, []);

  var playVsBot = useCallback(async function() {
    store.setIsSearching(true);
    store.resetMatchState();
    try {
      var res   = await serviceRef.current.callRpc("rpc_create_ai_match", {});
      var match = await serviceRef.current.joinMatch(res.matchId);
      store.setMatchId(match.match_id);
      store.setScreen("game");
    } catch (e) {
      store.showToast((e && e.message) || "Could not start AI match.");
    } finally {
      store.setIsSearching(false);
    }
  }, []);

  var sendMove = useCallback(function(position) {
    var matchId = useGameStore.getState().matchId;
    if (!matchId) return;
    serviceRef.current.sendMove(matchId, position);
  }, []);

  var leaveMatch = useCallback(async function() {
    var matchId = useGameStore.getState().matchId;
    try { if (matchId) await serviceRef.current.leaveMatch(matchId); } catch (e) {}
    store.resetMatchState();
  }, []);

  var fetchLeaderboard = useCallback(async function() {
    try {
      var res = await serviceRef.current.callRpc("rpc_get_leaderboard", {});
      return (res.records || []).map(function(r) {
        return {
          ownerId:  r.ownerId || r.owner_id,
          username: r.username || "Unknown",
          score:    r.score || 0,
          rank:     r.rank  || 0,
        };
      });
    } catch (e) {
      return [];
    }
  }, []);

  var refreshStats = useCallback(async function() {
    try {
      var res = await serviceRef.current.callRpc("rpc_get_my_stats", {});
      store.setStats({ wins: res.wins || 0, losses: res.losses || 0, draws: res.draws || 0 });
    } catch (e) {}
  }, []);

  return {
    login, logout,
    findMatch, createPrivateMatch, joinByCode, playVsBot,
    sendMove, leaveMatch,
    fetchLeaderboard, refreshStats,
  };
}
