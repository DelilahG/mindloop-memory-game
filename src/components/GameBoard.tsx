import type { CSSProperties } from 'react';
import type { CardData, Difficulty } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { Card } from './Card';

interface Props {
  cards: CardData[];
  difficulty: Difficulty;
  onCardClick: (id: number) => void;
}

export function GameBoard({ cards, difficulty, onCardClick }: Props) {
  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <div
      className="game-grid"
      style={{ '--cols': config.cols } as CSSProperties}
    >
      {cards.map(card => (
        <Card
          key={card.id}
          card={card}
          onClick={() => onCardClick(card.id)}
        />
      ))}
    </div>
  );
}
