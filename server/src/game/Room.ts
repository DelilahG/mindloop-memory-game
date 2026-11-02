import type { Difficulty, PublicPlayer } from '@mindloop/shared';
import { GameEngine } from './engine.js';

export type RoomState = 'waiting' | 'playing' | 'finished';

export class Room {
  static readonly RECONNECT_TIMEOUT = 60;

  readonly code: string;
  readonly difficulty: Difficulty;
  state: RoomState = 'waiting';
  readonly hostId: string;
  readonly players: Map<string, PublicPlayer> = new Map();
  engine: GameEngine | null = null;
  readonly createdAt: Date = new Date();
  disconnectedPlayer: string | null = null;
  disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(code: string, difficulty: Difficulty, host: PublicPlayer) {
    this.code = code;
    this.difficulty = difficulty;
    this.hostId = host.id;
    this.players.set(host.id, host);
  }

  addPlayer(player: PublicPlayer): boolean {
    if (this.players.size >= 2) return false;
    if (this.players.has(player.id)) return false;
    this.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  isFull(): boolean {
    return this.players.size >= 2;
  }

  start(): GameEngine {
    const ids = this.getPlayerIds();
    if (ids.length !== 2) throw new Error('Need exactly 2 players to start');
    this.engine = new GameEngine([ids[0], ids[1]], this.difficulty);
    this.state = 'playing';
    return this.engine;
  }

  handleDisconnect(playerId: string, timeoutSecs: number, onForfeit: () => void): void {
    this.disconnectedPlayer = playerId;
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.disconnectTimer = setTimeout(() => {
      if (this.disconnectedPlayer === playerId && this.state === 'playing') {
        onForfeit();
      }
    }, timeoutSecs * 1000);
  }

  handleReconnect(playerId: string): void {
    if (this.disconnectedPlayer === playerId) {
      this.disconnectedPlayer = null;
      if (this.disconnectTimer) {
        clearTimeout(this.disconnectTimer);
        this.disconnectTimer = null;
      }
    }
  }

  finish(): void {
    this.state = 'finished';
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  getPlayerIds(): string[] {
    return [...this.players.keys()];
  }
}
