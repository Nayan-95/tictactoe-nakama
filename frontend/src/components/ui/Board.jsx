/**
 * Board — 3×3 interactive game grid.
 * Props:
 *   board      {string[9]}   current cell values ("", "X", "O")
 *   winLine    {number[]|null} winning cell indices, or null
 *   myMark     {string}      "X" or "O"
 *   isMyTurn   {boolean}
 *   isActive   {boolean}     false disables all clicks (waiting / game over)
 *   onCellClick {function}   called with cell index (0–8)
 */
export default function Board({ board, winLine, myMark, isMyTurn, isActive, onCellClick }) {
  function cellClass(value, index) {
    var classes = ["cell"];
    if (value === "X") classes.push("cell--x");
    if (value === "O") classes.push("cell--o");
    if (!value && isMyTurn && isActive) classes.push("cell--playable");
    if (winLine && winLine.indexOf(index) !== -1) classes.push("cell--winning");
    return classes.join(" ");
  }

  return (
    <div className="board" role="grid" aria-label="Tic-Tac-Toe board">
      {board.map(function(value, index) {
        return (
          <button
            key={index}
            id={"cell-" + index}
            type="button"
            className={cellClass(value, index)}
            data-ghost={myMark}
            onClick={function() { if (isActive && isMyTurn && !value) onCellClick(index); }}
            disabled={!isActive || !isMyTurn || !!value}
            aria-label={"Cell " + (index + 1) + (value ? " " + value : "")}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
