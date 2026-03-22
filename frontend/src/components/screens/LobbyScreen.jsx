import { useState } from "react";
import { useGameStore } from "../../store/useGameStore.js";
import StatsGrid from "../ui/StatsGrid.jsx";

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

  function handleCopyCode() {
    if (navigator.clipboard && inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      if (store.showToast) store.showToast("Code copied!");
    }
  }

  // Right panel content
  var rightContent;

  if (isSearching) {
    rightContent = (
      <div className="lobby-searching">
        {inviteCode ? (
          <>
            <div className="invite-code-box">
              <span className="invite-code-label">ROOM CODE</span>
              <div className="invite-code-value" onClick={handleCopyCode}>{inviteCode}</div>
              <p className="invite-code-tap-hint">Tap to copy</p>
            </div>
            <p className="invite-code-hint">Share this code with a friend</p>
            <div className="dot-row">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </>
        ) : (
          <>
            <span className="spinner spinner--lg" />
            <span className="searching-label">FINDING OPPONENT...</span>
          </>
        )}
        <button id="cancel-search" className="btn btn--ghost btn--sm" onClick={handleCancel}>
          ✕ Cancel
        </button>
      </div>
    );
  } else {
    rightContent = (
      <>
        <p className="lobby-action-btn__label" style={{ fontFamily: "var(--font-arcade)", fontSize: "var(--text-xs)", letterSpacing: "0.15em", color: "var(--text-dim)", marginBottom: "var(--space-xs)" }}>GAME MODES</p>

        <div className="lobby-action-grid">
          <button id="quick-match-btn" className="lobby-action-btn lobby-action-btn--primary" onClick={nakama.findMatch} touch-action="manipulation">
            <span className="lobby-action-btn__icon">⚡</span>
            <span className="lobby-action-btn__label">QUICK MATCH</span>
          </button>
          <button id="vs-bot-btn" className="lobby-action-btn" onClick={nakama.playVsBot}>
            <span className="lobby-action-btn__icon">🤖</span>
            <span className="lobby-action-btn__label">VS CPU</span>
          </button>
          <button id="create-room-btn" className="lobby-action-btn" onClick={nakama.createPrivateMatch}>
            <span className="lobby-action-btn__icon">🔒</span>
            <span className="lobby-action-btn__label">CREATE ROOM</span>
          </button>
          <button id="join-code-toggle" className="lobby-action-btn" onClick={function() { setShowJoinInput(!showJoinInput); setJoinCode(""); }}>
            <span className="lobby-action-btn__icon">🎟</span>
            <span className="lobby-action-btn__label">JOIN CODE</span>
          </button>
        </div>

        {showJoinInput && (
          <form id="join-code-form" className="join-code-expand" onSubmit={handleJoinByCode}>
            <input
              id="join-code-input"
              className="field-input"
              type="text"
              value={joinCode}
              onChange={function(e) { setJoinCode(e.target.value.toUpperCase()); }}
              placeholder="ENTER CODE"
              maxLength={6}
              autoFocus
            />
            <button id="join-code-submit" type="submit" className="btn btn--amber">JOIN</button>
          </form>
        )}

        <div className="lobby-leaderboard-row">
          <button id="leaderboard-btn" className="btn btn--ghost lobby-leaderboard-btn" onClick={function() { store.setScreen("leaderboard"); }}>
            <span>🏆 View Leaderboard</span><span>→</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-layout">

        {/* LEFT — Player profile */}
        <div className="lobby-panel">
          <div className="lobby-profile">
            <div className="lobby-avatar">{(user && user.username || "?")[0].toUpperCase()}</div>
            <div className="lobby-user-info">
              <div className="lobby-username">{user && user.username}</div>
              <span className="lobby-online-pill">● ONLINE</span>
            </div>
          </div>

          <div className="divider-line" style={{ marginBottom: "var(--space-sm)" }} />

          <StatsGrid wins={stats.wins} losses={stats.losses} draws={stats.draws} />

          <div style={{ marginTop: "var(--space-md)" }}>
            <button id="logout-btn" className="btn btn--ghost btn--sm btn--full" onClick={nakama.logout}>← Exit</button>
          </div>
        </div>

        {/* RIGHT — Actions */}
        <div className="lobby-panel" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {rightContent}
        </div>

      </div>
    </div>
  );
}
