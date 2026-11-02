import { formatTime } from '../game/engine';

interface Props {
  time: number;
  moves: number;
  totalPairs: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function GameOver({ time, moves, totalPairs, onPlayAgain, onBackToMenu }: Props) {
  return (
    <div className="game-over">
      <div className="game-over-content">
        <h1>Game Over</h1>
        <p className="game-over-subtitle">You found all the pairs!</p>

        <div className="game-over-stats">
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">{formatTime(time)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Moves</span>
            <span className="stat-value">{moves}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pairs</span>
            <span className="stat-value">{totalPairs}/{totalPairs}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button type="button" className="btn-primary" onClick={onPlayAgain}>Play Again</button>
          <button type="button" className="btn-secondary" onClick={onBackToMenu}>Back to Menu</button>
        </div>
      </div>
    </div>
  );
}
