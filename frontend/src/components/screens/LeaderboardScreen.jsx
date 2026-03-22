import { useState, useEffect } from "react";
import { useGameStore } from "../../store/useGameStore.js";

export default function LeaderboardScreen({ nakama }) {
  var store = useGameStore();
  var [records, setRecords] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState("");

  function loadLeaderboard() {
    setLoading(true); setError("");
    nakama.fetchLeaderboard()
      .then(function(data) { setRecords(data || []); setLoading(false); })
      .catch(function()    { setError("Failed to load leaderboard."); setLoading(false); });
  }

  useEffect(function() { loadLeaderboard(); }, []);

  function rankTileClass(rank, idx) {
    var r = rank || idx + 1;
    if (r === 1) return "rank-tile rank-tile--1";
    if (r === 2) return "rank-tile rank-tile--2";
    if (r === 3) return "rank-tile rank-tile--3";
    return "rank-tile";
  }

  function rankCircle(rank, idx) {
    var r = rank || idx + 1;
    if (r === 1) return <div className="rank-circle rank-circle--1">1</div>;
    if (r === 2) return <div className="rank-circle rank-circle--2">2</div>;
    if (r === 3) return <div className="rank-circle rank-circle--3">3</div>;
    return <div className="rank-circle rank-circle--other">#{r}</div>;
  }

  return (
    <div className="leaderboard-screen">

      <div className="leaderboard-header">
        <span className="leaderboard-title">🏆 HALL OF FAME</span>
        <button id="back-lobby-btn" className="btn btn--ghost btn--sm" onClick={function() { store.setScreen("lobby"); }}>
          ← Back
        </button>
      </div>

      <span className="lb-subtitle">Top players by total wins</span>

      {loading && (
        <div className="lb-loading">
          <span className="spinner spinner--lg" />
          <span>Loading rankings...</span>
        </div>
      )}

      {!loading && error && (
        <div className="lb-loading">
          <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>{error}</p>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="lb-empty">
          <span className="lb-empty-icon">🏆</span>
          <span className="lb-empty-title">NO RECORDS YET</span>
          <span className="lb-empty-hint">Win matches to appear here.</span>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="leaderboard-list">
          {records.map(function(r, idx) {
            var rank = r.rank || idx + 1;
            return (
              <div key={r.ownerId || idx} className={rankTileClass(rank, idx)} style={{ animationDelay: (idx * 0.06) + "s" }}>
                {rankCircle(rank, idx)}
                <div className="rank-avatar">{(r.username || "?")[0].toUpperCase()}</div>
                <span className="rank-username">{r.username || "Unknown"}</span>
                <div className="rank-score-col">
                  <span className="rank-score-label">WINS</span>
                  <span className="rank-score-value">{r.score || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="leaderboard-actions">
          <button id="refresh-lb-btn" className="btn btn--outline btn--sm" onClick={loadLeaderboard}>
            ↺ Refresh
          </button>
          <button className="btn btn--ghost btn--sm" onClick={function() { store.setScreen("lobby"); }}>
            ← Back to Lobby
          </button>
        </div>
      )}

    </div>
  );
}
