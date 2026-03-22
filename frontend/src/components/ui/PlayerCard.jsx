/**
 * PlayerCard — vertical player column with mark circle.
 * Props unchanged: username, mark, isActive, tag
 * Visual: tall vertical card, mark circle on top, name + tag below.
 */
export default function PlayerCard({ username, mark, isActive, tag }) {
  var markClass = "mark-circle mark-circle--" + (mark || "x").toLowerCase();
  var colClass  = "player-column" + (isActive ? " player-column--active" : "");

  return (
    <div className={colClass}>
      <div className={markClass}>
        {mark || "?"}
      </div>
      <span className="player-col-name">{username || "..."}</span>
      {tag && <span className="player-col-tag">{tag}</span>}
    </div>
  );
}
