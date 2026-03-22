/**
 * StatsGrid — 3-column win/loss/draw counter.
 * Props:
 *   wins   {number}
 *   losses {number}
 *   draws  {number}
 */
export default function StatsGrid({ wins, losses, draws }) {
  return (
    <div className="stats-grid">
      <div className="stats-cell stats-cell--wins">
        <span className="stats-number">{wins}</span>
        <span className="stats-label">WINS</span>
      </div>
      <div className="stats-cell stats-cell--losses">
        <span className="stats-number">{losses}</span>
        <span className="stats-label">LOSSES</span>
      </div>
      <div className="stats-cell stats-cell--draws">
        <span className="stats-number">{draws}</span>
        <span className="stats-label">DRAWS</span>
      </div>
    </div>
  );
}
