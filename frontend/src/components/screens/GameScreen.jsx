import { useGameStore }   from "../../store/useGameStore.js";
import Board              from "../ui/Board.jsx";
import TurnTimer          from "../ui/TurnTimer.jsx";
import PlayerCard         from "../ui/PlayerCard.jsx";
import GameOverModal      from "../ui/GameOverModal.jsx";

/**
 * GameScreen — active match view.
 * All state comes from useGameStore. No local game logic.
 */
export default function GameScreen({ nakama }) {
  var store        = useGameStore();
  var user         = store.user;
  var gameState    = store.gameState;
  var gameOver     = store.gameOver;
  var timerPayload = store.timerPayload;
  var inviteCode   = store.inviteCode;
  var stats        = store.stats;

  // Derived values
  var board    = gameState ? gameState.board   : ["","","","","","","","",""];
  var marks    = gameState ? gameState.marks   : {};
  var players  = gameState ? gameState.players : [];
  var turn     = gameState ? gameState.turn    : "";
  var isAiMatch = gameState ? gameState.isAiMatch : false;

  var myId       = user ? user.id : "";
  var myMark     = marks[myId] || "";
  var opponentId = players.find(function(p) { return p !== myId; }) || "";

  // Infer opponent info from playerInfo if available, else fallback
  var playerInfo = gameState ? gameState.playerInfo : {};

  var opponentName = playerInfo[opponentId] || (opponentId ? "Opponent" : "...");
  var myName       = playerInfo[myId] || (user && user.username) || "You";
  var opponentMark = marks[opponentId] || "";

  var isMyTurn   = turn === myId;
  var hasTwoPlayers = players.length >= 2;
  var isActive   = hasTwoPlayers && !gameOver && !(gameState && gameState.gameOver);

  var timeLeft = timerPayload ? timerPayload.timeLeft : TURN_SECONDS;
  var TURN_SECONDS = 30;

  function handleAbandon() {
    nakama.leaveMatch().then(function() {
      store.setGameOver(null);
      store.setScreen("lobby");
    });
  }

  function handleRematch() {
    store.setGameOver(null);
    store.setScreen("lobby");
    // Trigger find match automatically for rematch
    setTimeout(function() { nakama.findMatch(); }, 100);
  }

  function handleLeaderboard() {
    store.setGameOver(null);
    store.setScreen("leaderboard");
  }

  function handleMainMenu() {
    store.setGameOver(null);
    store.setScreen("lobby");
  }

  return (
    <div className="screen screen--game">
      <div className="game-container">

        {/* Player header */}
        <div className="game-header">
          <PlayerCard
            username={myName}
            mark={myMark}
            isActive={isMyTurn && hasTwoPlayers}
            tag="YOU"
          />

          <div className="game-center-status">
            {hasTwoPlayers ? (
              isMyTurn ? (
                <span className="turn-indicator turn-indicator--mine">▶ YOUR MOVE</span>
              ) : (
                <span className="turn-indicator turn-indicator--opponent">⏳ WAITING</span>
              )
            ) : (
              <div className="waiting-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <p className="waiting-label">Awaiting opponent...</p>
              </div>
            )}
          </div>

          <PlayerCard
            username={opponentName}
            mark={opponentMark}
            isActive={!isMyTurn && hasTwoPlayers}
            tag={isAiMatch ? "CPU" : undefined}
          />
        </div>

        {/* Invite code banner — only visible before opponent joins */}
        {inviteCode && !hasTwoPlayers && (
          <div id="invite-code-banner" className="invite-banner">
            <span className="invite-banner__label">ROOM CODE</span>
            <span className="invite-banner__code">{inviteCode}</span>
            <span className="invite-banner__hint">Share with your opponent</span>
          </div>
        )}

        {/* Turn timer */}
        {hasTwoPlayers && !gameOver && (
          <TurnTimer
            timeLeft={typeof timeLeft === "number" ? timeLeft : TURN_SECONDS}
            totalTime={TURN_SECONDS}
            isMyTurn={isMyTurn}
          />
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

        {/* Abandon button */}
        <button
          id="abandon-btn"
          className="btn btn--danger btn--sm abandon-btn"
          onClick={handleAbandon}
        >
          ABANDON
        </button>
      </div>

      {/* Game over overlay */}
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
