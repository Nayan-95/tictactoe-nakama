import { useState } from "react";

/**
 * LoginScreen — frictionless device-auth entry.
 * Single input: display name / handle.
 * Validation: 2–20 chars, trim whitespace.
 */
export default function LoginScreen({ nakama }) {
  var [username, setUsername] = useState("");
  var [loading,  setLoading]  = useState(false);
  var [localError, setLocalError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    var trimmed = username.trim();
    setLocalError("");

    if (trimmed.length < 2) {
      setLocalError("Handle must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 20) {
      setLocalError("Handle must be 20 characters or fewer.");
      return;
    }

    setLoading(true);
    try {
      await nakama.login(trimmed);
    } catch (err) {
      setLocalError((err && err.message) || "Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen screen--login">
      <div className="card card--login">
        {/* SVG Logo */}
        <div className="login-logo" aria-hidden="true">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="20" x2="55" y2="55" stroke="#ff3864" strokeWidth="8" strokeLinecap="round"/>
            <line x1="55" y1="20" x2="20" y2="55" stroke="#ff3864" strokeWidth="8" strokeLinecap="round"/>
            <circle cx="90" cy="37" r="18" stroke="#00e5ff" strokeWidth="8" fill="none"/>
            <line x1="20" y1="85" x2="55" y2="120" stroke="#ff3864" strokeWidth="8" strokeLinecap="round"/>
            <line x1="55" y1="85" x2="20" y2="120" stroke="#ff3864" strokeWidth="8" strokeLinecap="round"/>
            <circle cx="90" cy="102" r="18" stroke="#00e5ff" strokeWidth="8" fill="none"/>
          </svg>
        </div>

        <h1 className="login-title">NEON GRID</h1>
        <p className="login-tagline">
          Real-time multiplayer · Server-authoritative · Powered by Nakama
        </p>

        <form id="login-form" className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="handle-input">YOUR HANDLE</label>
          <input
            id="handle-input"
            className="field-input"
            type="text"
            value={username}
            onChange={function(e) { setUsername(e.target.value); setLocalError(""); }}
            onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(e); }}
            placeholder="Nova, Specter, Jinx..."
            maxLength={20}
            autoComplete="off"
            autoFocus
            disabled={loading}
          />

          {localError && (
            <div id="login-error" className="login-error" role="alert">{localError}</div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-inner"><span className="spinner" /> CONNECTING...</span>
            ) : "JACK IN"}
          </button>
        </form>

        <div className="login-rules">
          <h3 className="rules-title">RULES</h3>
          <ul className="rules-list">
            <li>Get three in a row — horizontally, vertically, or diagonally</li>
            <li>X always goes first; turns alternate automatically</li>
            <li>You have <strong>30 seconds</strong> per turn or you forfeit</li>
            <li>Wins, losses, and draws are tracked on the global leaderboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
