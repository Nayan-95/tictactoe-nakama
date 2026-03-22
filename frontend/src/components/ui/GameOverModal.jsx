import Board from "../ui/Board.jsx";

/**
 * GameOverModal — fixed overlay shown when a match ends.
 * Props:
 *   gameOver    {GameOverPayload}
 *   user        {AuthUser}
 *   stats       {PlayerStats}
 *   onRematch   {function}
 *   onLeaderboard {function}
 *   onMainMenu  {function}
 */
export default function GameOverModal({ gameOver, user, stats, onRematch, onLeaderboard, onMainMenu }) {
  if (!gameOver) return null;

  var isWin  = gameOver.winner === (user && user.id);
  var isDraw = !gameOver.winner;
  var reason = gameOver.reason || "";

  var resultIcon, resultTitle, resultXp, resultColor, subMsg;

  if (isDraw) {
    resultIcon  = "🤝";
    resultTitle = "STALEMATE";
    resultXp    = "+50 XP";
    resultColor = "modal--draw";
    subMsg      = "Nobody cracked the grid this round.";
  } else if (isWin) {
    resultIcon  = "🎖";
    resultTitle = "VICTORY";
    resultXp    = "+200 XP";
    resultColor = "modal--win";
    if (reason === "timeout") {
      subMsg = "Enemy ran out of time.";
    } else if (reason === "opponent_left") {
      subMsg = "Opponent disconnected.";
    } else {
      subMsg = "You placed " + (gameOver.winnerMark || "") + " to win.";
    }
  } else {
    resultIcon  = "💀";
    resultTitle = "FLATLINED";
    resultXp    = "-100 XP";
    resultColor = "modal--loss";
    if (reason === "timeout") {
      subMsg = "You ran out of time.";
    } else if (reason === "opponent_left") {
      subMsg = "Opponent disconnected.";
    } else {
      subMsg = "Enemy placed " + (gameOver.winnerMark || "") + " to win.";
    }
  }

  var myMark = user && gameOver.marks && gameOver.marks[user.id] ? gameOver.marks[user.id] : "";

  return (
    <div id="game-over-modal" className="modal-overlay" role="dialog" aria-modal="true">
      <div className={"modal-card " + resultColor}>
        <div className="modal-icon">{resultIcon}</div>
        <h2 className="modal-title">{resultTitle}</h2>
        <p className="modal-sub">{subMsg}</p>
        <div className="modal-xp">{resultXp}</div>

        {/* Mini read-only board */}
        <div className="modal-board">
          <Board
            board={gameOver.board || ["","","","","","","","",""]}
            winLine={gameOver.winLine || null}
            myMark={myMark}
            isMyTurn={false}
            isActive={false}
            onCellClick={function() {}}
          />
        </div>

        {/* Stats row */}
        <div className="modal-stats">
          <div className="modal-stat modal-stat--win">
            <span className="modal-stat__num">{stats ? stats.wins : 0}</span>
            <span className="modal-stat__lbl">W</span>
          </div>
          <div className="modal-stat modal-stat--loss">
            <span className="modal-stat__num">{stats ? stats.losses : 0}</span>
            <span className="modal-stat__lbl">L</span>
          </div>
          <div className="modal-stat modal-stat--draw">
            <span className="modal-stat__num">{stats ? stats.draws : 0}</span>
            <span className="modal-stat__lbl">D</span>
          </div>
        </div>

        <div className="modal-actions">
          <button id="modal-rematch"      className="btn btn--primary"   onClick={onRematch}>REMATCH</button>
          <button id="modal-leaderboard"  className="btn btn--secondary" onClick={onLeaderboard}>LEADERBOARD</button>
          <button id="modal-main-menu"    className="btn btn--danger"    onClick={onMainMenu}>MAIN MENU</button>
        </div>
      </div>
    </div>
  );
}
