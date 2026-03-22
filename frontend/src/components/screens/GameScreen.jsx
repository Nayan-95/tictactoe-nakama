import { useGameStore }  from "../../store/useGameStore.js";
import Board             from "../ui/Board.jsx";
import TurnTimer         from "../ui/TurnTimer.jsx";
import PlayerCard        from "../ui/PlayerCard.jsx";
import GameOverModal     from "../ui/GameOverModal.jsx";

export default function GameScreen({ nakama }) {
  var store        = useGameStore();
  var user         = store.user;
  var gameState    = store.gameState;
  var gameOver     = store.gameOver;
  var timerPayload = store.timerPayload;
  var inviteCode   = store.inviteCode;
  var stats        = store.stats;

  var TURN_SECONDS = 30;

  var board     = gameState ? gameState.board   : ["","","","","","","","",""];
  var marks     = gameState ? gameState.marks   : {};
  var players   = gameState ? gameState.players : [];
  var turn      = gameState ? gameState.turn    : "";
  var isAiMatch = gameState ? gameState.isAiMatch : false;

  var myId         = user ? user.id : "";
  var myMark       = marks[myId] || "";
  var opponentId   = players.find(function(p) { return p !== myId; }) || "";
  var playerInfo   = gameState ? gameState.playerInfo : {};
  var opponentName = playerInfo[opponentId] || (opponentId ? "Opponent" : "...");
  var myName       = playerInfo[myId] || (user && user.username) || "You";
  var opponentMark = marks[opponentId] || "";

  var isMyTurn      = turn === myId;
  var hasTwoPlayers = players.length >= 2;
  var isActive      = hasTwoPlayers && !gameOver && !(gameState && gameState.gameOver);
  var isWaiting     = !hasTwoPlayers;
  var timeLeft      = timerPayload ? timerPayload.timeLeft : TURN_SECONDS;

  function handleAbandon() {
    nakama.leaveMatch().then(function() {
      store.setGameOver(null);
      store.setScreen("lobby");
    });
  }
  function handleRematch()     { store.setGameOver(null); store.setScreen("lobby"); setTimeout(function() { nakama.findMatch(); }, 100); }
  function handleLeaderboard() { store.setGameOver(null); store.setScreen("leaderboard"); }
  function handleMainMenu()    { store.setGameOver(null); store.setScreen("lobby"); }

  function handleCopyCode() {
    if (navigator.clipboard && inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  }

  // Turn pill class
  var pillClass = isMyTurn && isActive ? "game-turn-pill game-turn-pill--your-turn" : "game-turn-pill game-turn-pill--waiting";

  return (
    <div className="game-screen">

      {/* Mobile: horizontal chip bar — hidden on desktop via CSS */}
      <div className="game-players-bar">
        <div className={"player-chip" + (isMyTurn && isActive ? " player-chip--active-" + (myMark || "x").toLowerCase() : "")}>
          <span className={"player-chip-mark player-chip-mark--" + (myMark || "x").toLowerCase()}>{myMark || "?"}</span>
          <span className="player-chip-name">{myName}</span>
          <span className="player-chip-tag">YOU</span>
        </div>
        <span className="game-vs">VS</span>
        <div className={"player-chip" + (!isMyTurn && isActive ? " player-chip--active-" + (opponentMark || "o").toLowerCase() : "")}>
          <span className={"player-chip-mark player-chip-mark--" + (opponentMark || "o").toLowerCase()}>{opponentMark || "?"}</span>
          <span className="player-chip-name">{opponentName}</span>
          {isAiMatch && <span className="player-chip-tag">CPU</span>}
        </div>
      </div>

      {/* Desktop: flex row with player columns; Mobile: flex col board-area */}
      <div className="game-inner-layout">

        {/* Desktop-only left player column */}
        <PlayerCard
          username={myName}
          mark={myMark}
          isActive={isMyTurn && hasTwoPlayers}
          tag="YOU"
        />

        {/* Center: always visible */}
        <div className="game-board-area">

          {/* Turn pill */}
          {hasTwoPlayers ? (
            <div className={pillClass}>
              {isMyTurn ? "▶ YOUR TURN" : "⏳ THEIR TURN"}
            </div>
          ) : (
            <div className="game-turn-pill game-turn-pill--waiting">
              Awaiting opponent
              <span className="waiting-dots">
                <span className="waiting-dot" />
                <span className="waiting-dot" />
                <span className="waiting-dot" />
              </span>
            </div>
          )}

          {/* Invite code banner */}
          {inviteCode && isWaiting && (
            <div id="invite-code-banner" className="game-invite-banner">
              <div className="game-invite-label">ROOM CODE</div>
              <div className="game-invite-code" onClick={handleCopyCode}>{inviteCode}</div>
              <div className="invite-code-tap-hint">Tap to copy</div>
            </div>
          )}

          {/* Board */}
          <Board
            board={board}
            winLine={gameOver ? (gameOver.winLine || null) : null}
            myMark={myMark}
            isMyTurn={isMyTurn}
            isActive={isActive}
            onCellClick={nakama.sendMove}
          />

          {/* Timer */}
          {hasTwoPlayers && !gameOver && (
            <TurnTimer
              timeLeft={typeof timeLeft === "number" ? timeLeft : TURN_SECONDS}
              totalTime={TURN_SECONDS}
              isMyTurn={isMyTurn}
            />
          )}

        </div>

        {/* Desktop-only right player column */}
        <PlayerCard
          username={opponentName}
          mark={opponentMark}
          isActive={!isMyTurn && hasTwoPlayers}
          tag={isAiMatch ? "CPU" : undefined}
        />

      </div>

      {/* Abandon button — above home bar */}
      <div className="game-abandon-btn">
        <button id="abandon-btn" className="btn btn--ghost btn--sm" onClick={handleAbandon}>
          ← Leave Game
        </button>
      </div>

      {/* Game over panel */}
      {gameOver && (
        <GameOverModal
          gameOver={gameOver}
          user={user}
          stats={stats}
          onRematch={handleRematch}
          onLeaderboard={handleLeaderboard}
          onMainMenu={handleMainMenu}
        />
      )}

    </div>
  );
}
