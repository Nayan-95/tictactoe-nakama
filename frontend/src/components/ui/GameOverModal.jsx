import Board from "../ui/Board.jsx";

export default function GameOverModal({ gameOver, user, stats, onRematch, onLeaderboard, onMainMenu }) {
  if (!gameOver) return null;

  var isWin  = gameOver.winner === (user && user.id);
  var isDraw = !gameOver.winner;
  var reason = gameOver.reason || "";

  var resultIcon, resultTitle, resultXp, resultMod, subMsg;

  if (isDraw) {
    resultIcon  = "🤝";  resultTitle = "DRAW";
    resultXp    = "+50 XP"; resultMod = "draw";
    subMsg = "Nobody cracked the grid this round.";
  } else if (isWin) {
    resultIcon  = "🎖";  resultTitle = "YOU WIN";
    resultXp    = "+200 XP"; resultMod = "win";
    subMsg = reason === "timeout" ? "Enemy ran out of time."
           : reason === "opponent_left" ? "Opponent disconnected."
           : "You placed " + (gameOver.winnerMark || "") + " to win.";
  } else {
    resultIcon  = "💀";  resultTitle = "GAME OVER";
    resultXp    = "-100 XP"; resultMod = "loss";
    subMsg = reason === "timeout" ? "You ran out of time."
           : reason === "opponent_left" ? "Opponent disconnected."
           : "Enemy placed " + (gameOver.winnerMark || "") + " to win.";
  }

  var myMark = user && gameOver.marks && gameOver.marks[user.id] ? gameOver.marks[user.id] : "";

  return (
    <div id="game-over-modal" className="game-over-overlay" role="dialog" aria-modal="true">
      <div className={"game-over-panel game-over-panel--" + resultMod}>
        <div className="game-over-panel-inner">

          <div className="result-icon">{resultIcon}</div>
          <div className={"result-title result-title--" + resultMod}>{resultTitle}</div>
          <p className="result-reason">{subMsg}</p>
          <div className={"xp-badge xp-badge--" + resultMod}>{resultXp}</div>

          <div className="divider-line" style={{ width: "100%" }} />

          {/* Mini board */}
          <div className="result-mini-board">
            <Board
              board={gameOver.board || ["","","","","","","","",""]}
              winLine={gameOver.winLine || null}
              myMark={myMark}
              isMyTurn={false}
              isActive={false}
              onCellClick={function() {}}
            />
          </div>

          <div className="divider-line" style={{ width: "100%" }} />

          {/* Stats */}
          <div className="result-stats">
            <div className="result-stat result-stat--win">
              <span className="result-stat__lbl">WINS</span>
              <span className="result-stat__num">{stats ? stats.wins : 0}</span>
            </div>
            <div className="result-stat result-stat--loss">
              <span className="result-stat__lbl">LOSSES</span>
              <span className="result-stat__num">{stats ? stats.losses : 0}</span>
            </div>
            <div className="result-stat result-stat--draw">
              <span className="result-stat__lbl">DRAWS</span>
              <span className="result-stat__num">{stats ? stats.draws : 0}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="result-actions">
            <button id="modal-rematch"     className="btn btn--amber btn--full"   onClick={onRematch}>REMATCH</button>
            <button id="modal-leaderboard" className="btn btn--outline btn--full" onClick={onLeaderboard}>LEADERBOARD</button>
            <button id="modal-main-menu"   className="btn btn--ghost btn--full"   onClick={onMainMenu}>MAIN MENU</button>
          </div>

        </div>
      </div>
    </div>
  );
}
