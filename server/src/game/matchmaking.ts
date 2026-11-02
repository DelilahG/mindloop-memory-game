import type { Difficulty } from '@mindloop/shared';

export interface QueueEntry {
  playerId: string;
  socketId: string;
  difficulty: Difficulty;
  eloRating: number;
  joinedAt: number;
}

const INITIAL_ELO_RANGE = 200;
const EXPANDED_ELO_RANGE = 500;
const EXPAND_AFTER_MS = 15_000;

export class MatchmakingQueue {
  private readonly entries: Map<string, QueueEntry> = new Map();

  add(entry: QueueEntry): boolean {
    if (this.entries.has(entry.playerId)) return false;
    this.entries.set(entry.playerId, entry);
    return true;
  }

  remove(playerId: string): void {
    this.entries.delete(playerId);
  }

  has(playerId: string): boolean {
    return this.entries.has(playerId);
  }

  getQueueSize(difficulty: Difficulty): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.difficulty === difficulty) count++;
    }
    return count;
  }

  findMatch(difficulty: Difficulty): [QueueEntry, QueueEntry] | null {
    const candidates: QueueEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.difficulty === difficulty) {
        candidates.push(entry);
      }
    }

    if (candidates.length < 2) return null;

    let bestPair: [QueueEntry, QueueEntry] | null = null;
    let bestDiff = Infinity;

    const now = Date.now();
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        const eloDiff = Math.abs(a.eloRating - b.eloRating);

        const aWait = now - a.joinedAt;
        const bWait = now - b.joinedAt;
        const maxWait = Math.max(aWait, bWait);
        const range = maxWait > EXPAND_AFTER_MS ? EXPANDED_ELO_RANGE : INITIAL_ELO_RANGE;

        if (eloDiff <= range && eloDiff < bestDiff) {
          bestDiff = eloDiff;
          bestPair = [a, b];
        }
      }
    }

    if (bestPair) {
      this.entries.delete(bestPair[0].playerId);
      this.entries.delete(bestPair[1].playerId);
    }

    return bestPair;
  }
}
