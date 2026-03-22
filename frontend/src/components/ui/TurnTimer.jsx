/**
 * TurnTimer — compact bar.
 * Props unchanged: timeLeft, totalTime, isMyTurn
 * Uses: timer-bar, timer-track, timer-fill--safe/warn/danger, timer-count--safe/warn/danger
 */
export default function TurnTimer({ timeLeft, totalTime = 30, isMyTurn }) {
  var pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  var state = timeLeft <= 7 ? "danger" : timeLeft <= 15 ? "warn" : "safe";

  return (
    <div id="turn-timer" className="timer-bar">
      <span className="timer-label">{isMyTurn ? "YOU" : "OPP"}</span>
      <div className="timer-track">
        <div className={"timer-fill timer-fill--" + state} style={{ width: pct + "%" }} />
      </div>
      <span className={"timer-count timer-count--" + state}>{timeLeft}s</span>
    </div>
  );
}
