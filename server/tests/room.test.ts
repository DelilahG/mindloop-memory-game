import { describe, it, expect, vi } from 'vitest';
import { Room } from '../src/game/Room.js';
import type { PublicPlayer } from '@mindloop/shared';

function makePlayer(id: string): PublicPlayer {
  return {
    id,
    username: `user_${id}`,
    displayName: `User ${id}`,
    avatarColor: '#a594d0',
    eloRating: 1000,
  };
}

describe('Room', () => {
  it('creates a room with host', () => {
    const host = makePlayer('p1');
    const room = new Room('ABC123', 'easy', host);
    expect(room.code).toBe('ABC123');
    expect(room.difficulty).toBe('easy');
    expect(room.state).toBe('waiting');
    expect(room.hostId).toBe('p1');
    expect(room.players.size).toBe(1);
  });

  it('adds a second player', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    const result = room.addPlayer(makePlayer('p2'));
    expect(result).toBe(true);
    expect(room.players.size).toBe(2);
    expect(room.isFull()).toBe(true);
  });

  it('rejects third player', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    expect(room.addPlayer(makePlayer('p3'))).toBe(false);
  });

  it('rejects duplicate player', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    expect(room.addPlayer(makePlayer('p1'))).toBe(false);
  });

  it('removes player', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    room.removePlayer('p2');
    expect(room.players.size).toBe(1);
    expect(room.isFull()).toBe(false);
  });

  it('starts game with 2 players', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    const engine = room.start();
    expect(room.state).toBe('playing');
    expect(engine).toBeDefined();
    expect(engine.deck.length).toBe(12);
  });

  it('throws when starting with 1 player', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    expect(() => room.start()).toThrow('Need exactly 2 players');
  });

  it('getPlayerIds returns all player ids', () => {
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    const ids = room.getPlayerIds();
    expect(ids.sort()).toEqual(['p1', 'p2']);
  });

  it('handles disconnect and reconnect', () => {
    vi.useFakeTimers();
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    room.start();

    const forfeit = vi.fn();
    room.handleDisconnect('p2', 60, forfeit);
    expect(room.disconnectedPlayer).toBe('p2');

    room.handleReconnect('p2');
    expect(room.disconnectedPlayer).toBeNull();

    vi.advanceTimersByTime(61_000);
    expect(forfeit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires forfeit after timeout', () => {
    vi.useFakeTimers();
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    room.start();

    const forfeit = vi.fn();
    room.handleDisconnect('p2', 60, forfeit);

    vi.advanceTimersByTime(61_000);
    expect(forfeit).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('finish sets state and clears timer', () => {
    vi.useFakeTimers();
    const room = new Room('ABC123', 'easy', makePlayer('p1'));
    room.addPlayer(makePlayer('p2'));
    room.start();

    const forfeit = vi.fn();
    room.handleDisconnect('p2', 60, forfeit);
    room.finish();

    expect(room.state).toBe('finished');
    vi.advanceTimersByTime(61_000);
    expect(forfeit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('RECONNECT_TIMEOUT is 60 seconds', () => {
    expect(Room.RECONNECT_TIMEOUT).toBe(60);
  });
});
