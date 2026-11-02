import type { Difficulty } from '@mindloop/shared';
import { SYMBOLS, DIFFICULTY_CONFIG } from '@mindloop/shared';

type FlipResult =
  | { type: 'error'; message: string }
  | { type: 'revealed'; cardIndex: number; symbol: string }
  | { type: 'match'; card1: number; card2: number; symbol: string; scores: Record<string, number> }
  | { type: 'mismatch'; card1: number; card2: number; symbol1: string; symbol2: string; nextTurnPlayerId: string };

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class GameEngine {
  readonly deck: string[];
  readonly matchedCards: Set<number> = new Set();
  readonly scores: Map<string, number>;
  readonly players: [string, string];
  currentTurn: number;
  readonly totalPairs: number;
  totalMoves = 0;
  firstFlip: number | null = null;
  isLocked = false;
  readonly startedAt: Date;

  constructor(players: [string, string], difficulty: Difficulty) {
    this.players = players;
    const config = DIFFICULTY_CONFIG[difficulty];
    this.totalPairs = config.pairs;

    const selected = SYMBOLS.slice(0, config.pairs);
    const cards: string[] = [];
    for (const symbol of selected) {
      cards.push(symbol, symbol);
    }
    this.deck = shuffle(cards);

    this.scores = new Map<string, number>();
    this.scores.set(players[0], 0);
    this.scores.set(players[1], 0);

    this.currentTurn = Math.random() < 0.5 ? 0 : 1;
    this.startedAt = new Date();
  }

  getCurrentPlayerId(): string {
    return this.players[this.currentTurn];
  }

  getCardSymbol(index: number): string | null {
    if (index < 0 || index >= this.deck.length) return null;
    if (this.matchedCards.has(index)) return this.deck[index];
    if (this.firstFlip === index) return this.deck[index];
    return null;
  }

  flipCard(playerId: string, cardIndex: number): FlipResult {
    if (this.isLocked) {
      return { type: 'error', message: 'Board is locked' };
    }
    if (playerId !== this.getCurrentPlayerId()) {
      return { type: 'error', message: 'Not your turn' };
    }
    if (cardIndex < 0 || cardIndex >= this.deck.length) {
      return { type: 'error', message: 'Invalid card index' };
    }
    if (this.matchedCards.has(cardIndex)) {
      return { type: 'error', message: 'Card already matched' };
    }
    if (this.firstFlip === cardIndex) {
      return { type: 'error', message: 'Card already flipped' };
    }

    const symbol = this.deck[cardIndex];

    if (this.firstFlip === null) {
      this.firstFlip = cardIndex;
      return { type: 'revealed', cardIndex, symbol };
    }

    // Second flip
    this.totalMoves++;
    const firstIndex = this.firstFlip;
    const firstSymbol = this.deck[firstIndex];
    this.firstFlip = null;

    if (firstSymbol === symbol) {
      this.matchedCards.add(firstIndex);
      this.matchedCards.add(cardIndex);
      const current = this.scores.get(playerId) ?? 0;
      this.scores.set(playerId, current + 1);

      const scores: Record<string, number> = {};
      for (const [pid, s] of this.scores) {
        scores[pid] = s;
      }

      return { type: 'match', card1: firstIndex, card2: cardIndex, symbol, scores };
    }

    // Mismatch — switch turn
    this.currentTurn = this.currentTurn === 0 ? 1 : 0;
    return {
      type: 'mismatch',
      card1: firstIndex,
      card2: cardIndex,
      symbol1: firstSymbol,
      symbol2: symbol,
      nextTurnPlayerId: this.getCurrentPlayerId(),
    };
  }

  isComplete(): boolean {
    return this.matchedCards.size === this.totalPairs * 2;
  }

  getWinnerId(): string | null {
    const s0 = this.scores.get(this.players[0]) ?? 0;
    const s1 = this.scores.get(this.players[1]) ?? 0;
    if (s0 === s1) return null;
    return s0 > s1 ? this.players[0] : this.players[1];
  }

  isDraw(): boolean {
    const s0 = this.scores.get(this.players[0]) ?? 0;
    const s1 = this.scores.get(this.players[1]) ?? 0;
    return s0 === s1;
  }

  getRevealedCards(): Array<{ index: number; symbol: string }> {
    const result: Array<{ index: number; symbol: string }> = [];
    for (const index of this.matchedCards) {
      result.push({ index, symbol: this.deck[index] });
    }
    return result;
  }

  getMatchedIndices(): number[] {
    return [...this.matchedCards];
  }

  getDuration(): number {
    return Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
  }
}
