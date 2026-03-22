import { useState } from "react";
import { useGameStore } from "../../store/useGameStore.js";
import StatsGrid from "../ui/StatsGrid.jsx";

/**
 * LobbyScreen — match selection hub.
 * Shows user header, stats, quick match, AI match, private room flows.
 */
export default function LobbyScreen({ nakama }) {
  var store      = useGameStore();
  var user       = store.user;
  var isSearching = store.isSearching;
  var inviteCode = store.inviteCode;
  var stats      = store.stats;

  var [showJoinInput, setShowJoinInput] = useState(false);
  var [joinCode,      setJoinCode]      = useState("");

  function handleCancel() {
    nakama.leaveMatch();
    store.resetMatchState();
  }

  function handleJoinByCode(e) {
    e.preventDefault();
    if (joinCode.trim()) nakama.joinByCode(joinCode.trim());
  }

  // ── Searching / waiting state ─────────────────────────────────────────────
  if (isSearching) {
    return (
      <div className="screen screen--lobby">
        <div className="card card--searching">
          {inviteCode ? (
            <>
              <p className="search-label">PRIVATE ROOM CREATED</p>
              <div className="invite-code-display">
                <span className="invite-code-text">{inviteCode}</span>
              </div>
              <p className="search-hint">Share this code with your opponent</p>
              <div className="dot-row">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
              <p className="search-status">Awaiting opponent...</p>
            </>
          ) : (
            <>
              <div className="spinner search-spinner" />
              <p className="search-status">Searching for opponent...</p>
            </>
          )}
          <button id="cancel-search" className="btn btn--danger btn--sm" onClick={handleCancel}>
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  // ── Normal lobby ──────────────────────────────────────────────────────────
  return (
    <div className="screen screen--lobby">
      <div className="card card--lobby">
        {/* Header */}
        <div className="lobby-header">
          <div className="lobby-avatar">{(user && user.username || "?")[0].toUpperCase()}</div>
          <div className="lobby-user-info">
            <span className="lobby-username">{user && user.username}</span>
            <span className="lobby-online-badge">● ONLINE</span>
          </div>
          <button id="logout-btn" className="btn btn--secondary btn--sm" onClick={nakama.logout}>
            LOGOUT
          </button>
        </div>

        <h1 className="lobby-title">⚡ ARENA</h1>

        <StatsGrid wins={stats.wins} losses={stats.losses} draws={stats.draws} />

        {/* Play buttons */}
        <div className="lobby-actions">
          <button
            id="quick-match-btn"
            className="btn btn--primary btn--full btn--lg"
            onClick={nakama.findMatch}
          >
            ⚡ QUICK MATCH
          </button>

          <button
            id="vs-bot-btn"
            className="btn btn--secondary btn--full btn--lg"
            onClick={nakama.playVsBot}
          >
            🤖 VS CPU BOT
          </button>
        </div>

        {/* Private room divider */}
        <div className="divider"><span>── PRIVATE ROOM ──</span></div>

        <div className="lobby-actions">
          <button
            id="create-room-btn"
            className="btn btn--secondary btn--full"
            onClick={nakama.createPrivateMatch}
          >
            🔒 CREATE PRIVATE ROOM
          </button>

          <button
            id="join-code-toggle"
            className="btn btn--secondary btn--full"
            onClick={function() { setShowJoinInput(!showJoinInput); setJoinCode(""); }}
          >
            🎟 JOIN WITH CODE
          </button>

          {showJoinInput && (
            <form id="join-code-form" className="join-code-form" onSubmit={handleJoinByCode}>
              <input
                id="join-code-input"
                className="field-input"
                type="text"
                value={joinCode}
                onChange={function(e) { setJoinCode(e.target.value.toUpperCase()); }}
                placeholder="Enter 6-char code"
                maxLength={6}
                autoFocus
              />
              <button id="join-code-submit" type="submit" className="btn btn--primary">JOIN</button>
            </form>
          )}
        </div>

        {/* Leaderboard */}
        <div className="divider"><span></span></div>

        <button
          id="leaderboard-btn"
          className="btn btn--secondary btn--full"
          onClick={function() { store.setScreen("leaderboard"); }}
        >
          🏆 LEADERBOARD
        </button>
      </div>
    </div>
  );
}
