/**
 * PlayerCard — shows a player's mark + name with active-turn glow.
 * Props:
 *   username  {string}
 *   mark      {string}   "X" or "O"
 *   isActive  {boolean}  true when it's this player's turn
 *   tag       {string}   label below name, e.g. "YOU" or "CPU"
 */
export default function PlayerCard({ username, mark, isActive, tag }) {
  return (
    <div className={"player-card" + (isActive ? " player-card--active" : "")}>
      <div className={"player-card__mark player-card__mark--" + (mark || "x").toLowerCase()}>
        {mark || "?"}
      </div>
      <div className="player-card__info">
        <span className="player-card__name">{username || "..."}</span>
        {tag && <span className="player-card__tag">{tag}</span>}
      </div>
    </div>
  );
}
