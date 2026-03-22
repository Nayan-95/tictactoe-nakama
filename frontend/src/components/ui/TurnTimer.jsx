/**
 * TurnTimer — progress bar with color-coded urgency states.
 * Props:
 *   timeLeft  {number}  seconds remaining
 *   totalTime {number}  max seconds (default 30)
 *   isMyTurn  {boolean}
 */
export default function TurnTimer({ timeLeft, totalTime = 30, isMyTurn }) {
  var pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));

  var urgency = "timer--safe";
  if (timeLeft <= 15) urgency = "timer--warn";
  if (timeLeft <= 7)  urgency = "timer--danger";

  return (
    <div id="turn-timer" className={"timer-bar " + urgency}>
      <div className="timer-labels">
        <span className="timer-label-left">
          {isMyTurn ? "⚡ YOUR TURN" : "⏳ OPPONENT'S TURN"}
        </span>
        <span className="timer-label-right">{timeLeft}s</span>
      </div>
      <div className="timer-track">
        <div
          className="timer-fill"
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
}
