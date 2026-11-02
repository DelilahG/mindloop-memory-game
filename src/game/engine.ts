import type { CardData } from '../types';

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createDeck(symbols: readonly string[], pairCount: number): CardData[] {
  const selected = symbols.slice(0, pairCount);
  const cards: CardData[] = [];
  selected.forEach((symbol, i) => {
    cards.push({ id: i * 2, symbol, isFlipped: false, isMatched: false });
    cards.push({ id: i * 2 + 1, symbol, isFlipped: false, isMatched: false });
  });
  return shuffle(cards);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
