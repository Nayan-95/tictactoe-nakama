/**
 * StatsGrid — vertical W/L/D list.
 * Props unchanged: wins, losses, draws
 */
export default function StatsGrid({ wins, losses, draws }) {
  return (
    <div className="stats-list">
      <div className="stat-row">
        <span className="stat-row-label">WINS</span>
        <span className="stat-row-value stat-row-value--wins">{wins}</span>
      </div>
      <div className="stat-row">
        <span className="stat-row-label">LOSSES</span>
        <span className="stat-row-value stat-row-value--losses">{losses}</span>
      </div>
      <div className="stat-row">
        <span className="stat-row-label">DRAWS</span>
        <span className="stat-row-value stat-row-value--draws">{draws}</span>
      </div>
    </div>
  );
}
