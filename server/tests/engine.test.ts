import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/game/engine.js';

describe('GameEngine', () => {
  const players: [string, string] = ['p1', 'p2'];

  it('creates a deck with correct number of cards', () => {
    const engine = new GameEngine(players, 'easy');
    expect(engine.deck.length).toBe(12); // 6 pairs
  });

  it('creates correct number of pairs per difficulty', () => {
    expect(new GameEngine(players, 'easy').deck.length).toBe(12);
    expect(new GameEngine(players, 'medium').deck.length).toBe(16);
    expect(new GameEngine(players, 'hard').deck.length).toBe(20);
    expect(new GameEngine(players, 'expert').deck.length).toBe(30);
  });

  it('deck contains exactly two of each symbol', () => {
    const engine = new GameEngine(players, 'easy');
    const counts = new Map<string, number>();
    for (const s of engine.deck) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it('initializes scores to 0', () => {
    const engine = new GameEngine(players, 'easy');
    expect(engine.scores.get('p1')).toBe(0);
    expect(engine.scores.get('p2')).toBe(0);
  });

  it('assigns first turn to one of the two players', () => {
    const engine = new GameEngine(players, 'easy');
    expect(['p1', 'p2']).toContain(engine.getCurrentPlayerId());
  });

  it('rejects flip from wrong player', () => {
    const engine = new GameEngine(players, 'easy');
    const wrongPlayer = engine.getCurrentPlayerId() === 'p1' ? 'p2' : 'p1';
    const result = engine.flipCard(wrongPlayer, 0);
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Not your turn');
    }
  });

  it('rejects flip of invalid card index', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    expect(engine.flipCard(current, -1).type).toBe('error');
    expect(engine.flipCard(current, 999).type).toBe('error');
  });

  it('first flip reveals card', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const result = engine.flipCard(current, 0);
    expect(result.type).toBe('revealed');
    if (result.type === 'revealed') {
      expect(result.cardIndex).toBe(0);
      expect(result.symbol).toBe(engine.deck[0]);
    }
  });

  it('rejects flipping same card twice', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    engine.flipCard(current, 0);
    const result = engine.flipCard(current, 0);
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Card already flipped');
    }
  });

  it('detects match correctly', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const symbol = engine.deck[0];
    const matchIndex = engine.deck.findIndex((s, i) => i !== 0 && s === symbol);

    engine.flipCard(current, 0);
    const result = engine.flipCard(current, matchIndex);
    expect(result.type).toBe('match');
    if (result.type === 'match') {
      expect(result.symbol).toBe(symbol);
      expect(result.scores[current]).toBe(1);
    }
  });

  it('keeps turn on match', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const symbol = engine.deck[0];
    const matchIndex = engine.deck.findIndex((s, i) => i !== 0 && s === symbol);

    engine.flipCard(current, 0);
    engine.flipCard(current, matchIndex);
    expect(engine.getCurrentPlayerId()).toBe(current);
  });

  it('switches turn on mismatch', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();

    let idx1 = 0;
    let idx2 = 1;
    while (engine.deck[idx1] === engine.deck[idx2]) {
      idx2++;
    }

    engine.flipCard(current, idx1);
    const result = engine.flipCard(current, idx2);
    expect(result.type).toBe('mismatch');
    expect(engine.getCurrentPlayerId()).not.toBe(current);
  });

  it('rejects flipping already matched card', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const symbol = engine.deck[0];
    const matchIndex = engine.deck.findIndex((s, i) => i !== 0 && s === symbol);

    engine.flipCard(current, 0);
    engine.flipCard(current, matchIndex);

    const result = engine.flipCard(current, 0);
    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Card already matched');
    }
  });

  it('increments totalMoves on second flip', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    expect(engine.totalMoves).toBe(0);
    engine.flipCard(current, 0);
    expect(engine.totalMoves).toBe(0);
    engine.flipCard(current, 1);
    expect(engine.totalMoves).toBe(1);
  });

  it('completes game when all pairs matched', () => {
    const engine = new GameEngine(players, 'easy');
    expect(engine.isComplete()).toBe(false);

    // Match all pairs by finding matching indices
    const used = new Set<number>();
    let current = engine.getCurrentPlayerId();

    for (let i = 0; i < engine.deck.length; i++) {
      if (used.has(i)) continue;
      const match = engine.deck.findIndex((s, j) => j !== i && !used.has(j) && s === engine.deck[i]);
      if (match === -1) continue;

      const r1 = engine.flipCard(current, i);
      if (r1.type === 'error') {
        // Wrong player, switch
        current = current === 'p1' ? 'p2' : 'p1';
        engine.flipCard(current, i);
      }
      const r2 = engine.flipCard(current, match);
      if (r2.type === 'match') {
        used.add(i);
        used.add(match);
      } else if (r2.type === 'mismatch') {
        current = engine.getCurrentPlayerId();
      }
    }

    expect(engine.isComplete()).toBe(true);
  });

  it('getWinnerId returns player with most pairs', () => {
    const engine = new GameEngine(players, 'easy');
    engine.scores.set('p1', 4);
    engine.scores.set('p2', 2);
    expect(engine.getWinnerId()).toBe('p1');
  });

  it('isDraw returns true on tied scores', () => {
    const engine = new GameEngine(players, 'easy');
    engine.scores.set('p1', 3);
    engine.scores.set('p2', 3);
    expect(engine.isDraw()).toBe(true);
    expect(engine.getWinnerId()).toBeNull();
  });

  it('getRevealedCards returns matched cards', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const symbol = engine.deck[0];
    const matchIndex = engine.deck.findIndex((s, i) => i !== 0 && s === symbol);

    engine.flipCard(current, 0);
    engine.flipCard(current, matchIndex);

    const revealed = engine.getRevealedCards();
    expect(revealed.length).toBe(2);
    expect(revealed.every(r => r.symbol === symbol)).toBe(true);
  });

  it('getMatchedIndices returns indices of matched cards', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();
    const symbol = engine.deck[0];
    const matchIndex = engine.deck.findIndex((s, i) => i !== 0 && s === symbol);

    engine.flipCard(current, 0);
    engine.flipCard(current, matchIndex);

    const indices = engine.getMatchedIndices();
    expect(indices).toContain(0);
    expect(indices).toContain(matchIndex);
  });

  it('getDuration returns elapsed seconds', () => {
    const engine = new GameEngine(players, 'easy');
    expect(engine.getDuration()).toBeGreaterThanOrEqual(0);
    expect(engine.getDuration()).toBeLessThan(2);
  });

  it('getCardSymbol only reveals matched or currently flipped cards', () => {
    const engine = new GameEngine(players, 'easy');
    const current = engine.getCurrentPlayerId();

    // Unflipped card returns null
    expect(engine.getCardSymbol(0)).toBeNull();

    // Flip first card — now revealed
    engine.flipCard(current, 0);
    expect(engine.getCardSymbol(0)).toBe(engine.deck[0]);

    // Other unflipped card still null
    expect(engine.getCardSymbol(2)).toBeNull();
  });
});
