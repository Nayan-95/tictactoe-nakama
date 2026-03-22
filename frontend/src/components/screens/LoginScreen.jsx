import { useState } from "react";

export default function LoginScreen({ nakama }) {
  var [username,   setUsername]   = useState("");
  var [loading,    setLoading]    = useState(false);
  var [localError, setLocalError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    var trimmed = username.trim();
    setLocalError("");
    if (trimmed.length < 2)  { setLocalError("Handle must be at least 2 characters."); return; }
    if (trimmed.length > 20) { setLocalError("Handle must be 20 characters or fewer."); return; }
    setLoading(true);
    try   { await nakama.login(trimmed); }
    catch (err) { setLocalError((err && err.message) || "Connection failed. Try again."); }
    finally     { setLoading(false); }
  }

  return (
    <div className="login-screen">

      {/* LEFT / TOP — decorative arcade panel */}
      <div className="login-hero-panel">
        <div className="login-floating-marks">
          <span className="login-mark-x">X</span>
          <span className="login-mark-o">O</span>
        </div>
        <div className="login-game-title">NEON GRID</div>
        <p className="login-tagline">
          Multiplayer · Server‑Authoritative<br />Powered by Nakama
        </p>
      </div>

      {/* RIGHT / BOTTOM — login form */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <span className="login-section-label">PLAYER SELECT</span>

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-fields">
              <div>
                <label className="field-label" htmlFor="handle-input">HANDLE</label>
                <input
                  id="handle-input"
                  className="field-input"
                  type="text"
                  value={username}
                  onChange={function(e) { setUsername(e.target.value); setLocalError(""); }}
                  placeholder="Nova, Specter, Jinx..."
                  maxLength={20}
                  autoComplete="off"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {localError && (
                <div id="login-error" className="login-error" role="alert">{localError}</div>
              )}

              <button
                id="login-submit"
                type="submit"
                className="btn btn--amber btn--full"
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> LOADING...</> : "INSERT COIN"}
              </button>
            </div>
          </form>

          <div className="login-rules-wrap">
            <div className="rules-divider" />
            <ul className="rules-items">
              <li>Get three in a row — horizontal, vertical, or diagonal</li>
              <li>X always goes first; turns alternate automatically</li>
              <li>You have <strong>30 seconds</strong> per turn or you forfeit</li>
              <li>Wins, losses and draws appear on the global leaderboard</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
