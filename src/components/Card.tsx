import type { CardData } from '../types';
import { CardSymbol } from '../CardSymbols';

interface Props {
  card: CardData;
  onClick: () => void;
}

export function Card({ card, onClick }: Props) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <button
      type="button"
      className={`card${isRevealed ? ' is-flipped' : ''}${card.isMatched ? ' is-matched' : ''}`}
      onClick={onClick}
      disabled={card.isMatched}
      aria-label={isRevealed ? `${card.symbol} card` : 'Face-down card'}
    >
      <div className="card-inner">
        <div className="card-face card-back">
          <div className="card-back-pattern" />
        </div>
        <div className="card-face card-front">
          <CardSymbol symbol={card.symbol} className="card-symbol" />
        </div>
      </div>
    </button>
  );
}
