import { useState, useEffect } from "react";
import { useGameStore } from "../../store/useGameStore.js";

/**
 * LeaderboardScreen — fetches and displays top 10 wins.
 */
export default function LeaderboardScreen({ nakama }) {
  var store = useGameStore();
  var [records, setRecords] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error,   setError]   = useState("");

  function loadLeaderboard() {
    setLoading(true);
    setError("");
    nakama.fetchLeaderboard()
      .then(function(data) {
        setRecords(data || []);
        setLoading(false);
      })
      .catch(function() {
        setError("Failed to load leaderboard.");
        setLoading(false);
      });
  }

  useEffect(function() { loadLeaderboard(); }, []);

  function rankIcon(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "#" + rank;
  }

  return (
    <div className="screen screen--leaderboard">
      <div className="card card--leaderboard">
        <div className="lb-header">
          <h1 className="lb-title">🏆 LEADERBOARD</h1>
          <div className="lb-header-actions">
            <button
              id="refresh-lb-btn"
              className="btn btn--secondary btn--sm"
              onClick={loadLeaderboard}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "↺ REFRESH"}
            </button>
            <button
              id="back-lobby-btn"
              className="btn btn--secondary btn--sm"
              onClick={function() { store.setScreen("lobby"); }}
            >
              ← BACK
            </button>
          </div>
        </div>

        {loading && (
          <div className="lb-loading">
            <span className="spinner" />
            <p>Loading rankings...</p>
          </div>
        )}

        {!loading && error && (
          <p className="lb-error" role="alert">{error}</p>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="lb-empty">
            <span className="lb-empty-icon">🏆</span>
            <p>No records yet. Be the first to win!</p>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <table className="lb-table" aria-label="Leaderboard">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>WINS</th>
              </tr>
            </thead>
            <tbody>
              {records.map(function(r, idx) {
                var rank = r.rank || idx + 1;
                var isTop = rank <= 3;
                return (
                  <tr key={r.ownerId || idx} className={isTop ? "lb-row lb-row--top" : "lb-row"}>
                    <td className="lb-rank">{rankIcon(rank)}</td>
                    <td className="lb-player">
                      <div className="lb-avatar">{(r.username || "?")[0].toUpperCase()}</div>
                      <span className="lb-username">{r.username || "Unknown"}</span>
                    </td>
                    <td className="lb-score">{r.score || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
