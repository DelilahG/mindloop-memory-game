import { describe, it, expect } from 'vitest';
import { MatchmakingQueue } from '../src/game/matchmaking.js';
import type { QueueEntry } from '../src/game/matchmaking.js';

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    playerId: 'p1',
    socketId: 's1',
    difficulty: 'easy',
    eloRating: 1000,
    joinedAt: Date.now(),
    ...overrides,
  };
}

describe('MatchmakingQueue', () => {
  it('adds and removes entries', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1' }));
    expect(q.has('p1')).toBe(true);
    q.remove('p1');
    expect(q.has('p1')).toBe(false);
  });

  it('rejects duplicate player', () => {
    const q = new MatchmakingQueue();
    expect(q.add(makeEntry({ playerId: 'p1' }))).toBe(true);
    expect(q.add(makeEntry({ playerId: 'p1' }))).toBe(false);
  });

  it('getQueueSize counts by difficulty', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', difficulty: 'easy' }));
    q.add(makeEntry({ playerId: 'p2', difficulty: 'easy' }));
    q.add(makeEntry({ playerId: 'p3', difficulty: 'hard' }));
    expect(q.getQueueSize('easy')).toBe(2);
    expect(q.getQueueSize('hard')).toBe(1);
    expect(q.getQueueSize('medium')).toBe(0);
  });

  it('returns null when fewer than 2 candidates', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', difficulty: 'easy' }));
    expect(q.findMatch('easy')).toBeNull();
  });

  it('matches two players with close elo', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', eloRating: 1000 }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', eloRating: 1050 }));
    const result = q.findMatch('easy');
    expect(result).not.toBeNull();
    expect(result![0].playerId).not.toBe(result![1].playerId);
  });

  it('removes matched players from queue', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', eloRating: 1000 }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', eloRating: 1050 }));
    q.findMatch('easy');
    expect(q.has('p1')).toBe(false);
    expect(q.has('p2')).toBe(false);
  });

  it('rejects players too far apart in elo (fresh entries)', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', eloRating: 1000 }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', eloRating: 1300 }));
    expect(q.findMatch('easy')).toBeNull();
  });

  it('expands elo range after 15s wait', () => {
    const q = new MatchmakingQueue();
    const old = Date.now() - 20_000;
    q.add(makeEntry({ playerId: 'p1', eloRating: 1000, joinedAt: old }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', eloRating: 1400, joinedAt: old }));
    const result = q.findMatch('easy');
    expect(result).not.toBeNull();
  });

  it('does not match across difficulties', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', difficulty: 'easy' }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', difficulty: 'hard' }));
    expect(q.findMatch('easy')).toBeNull();
    expect(q.findMatch('hard')).toBeNull();
  });

  it('picks the closest elo pair among multiple candidates', () => {
    const q = new MatchmakingQueue();
    q.add(makeEntry({ playerId: 'p1', eloRating: 1000 }));
    q.add(makeEntry({ playerId: 'p2', socketId: 's2', eloRating: 1150 }));
    q.add(makeEntry({ playerId: 'p3', socketId: 's3', eloRating: 1010 }));
    const result = q.findMatch('easy')!;
    const ids = [result[0].playerId, result[1].playerId].sort();
    expect(ids).toEqual(['p1', 'p3']);
  });
});
