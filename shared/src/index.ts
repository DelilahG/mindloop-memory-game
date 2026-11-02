// Difficulty and game types shared between client and server

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyConfig {
  pairs: number;
  cols: number;
  label: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy:   { pairs: 6,  cols: 4, label: 'Easy' },
  medium: { pairs: 8,  cols: 4, label: 'Medium' },
  hard:   { pairs: 10, cols: 5, label: 'Hard' },
  expert: { pairs: 15, cols: 6, label: 'Expert' },
};

export const SYMBOLS = [
  'star', 'moon', 'cat', 'flower', 'leaf',
  'diamond', 'butterfly', 'heart', 'sun', 'cloud',
  'mushroom', 'eye', 'crystal', 'feather', 'drop',
] as const;

export type Symbol = (typeof SYMBOLS)[number];

// Multiplayer types

export interface PublicPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  eloRating: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalPairs: number;
  eloRating: number;
}

export interface PlayerProfile extends PublicPlayer {
  email: string;
  stats: PlayerStats;
  createdAt: string;
}

export interface MatchSummary {
  id: string;
  difficulty: Difficulty;
  opponent: { id: string; username: string; displayName: string };
  myPairs: number;
  opponentPairs: number;
  won: boolean | null;
  isDraw: boolean;
  durationSecs: number;
  finishedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
}

// Socket.IO event types

export interface RoomState {
  roomCode: string;
  difficulty: Difficulty;
  players: PublicPlayer[];
  isReady: boolean;
}

export interface GameStartPayload {
  difficulty: Difficulty;
  cols: number;
  totalPairs: number;
  totalCards: number;
  yourTurn: boolean;
  opponent: PublicPlayer;
  scores: { you: number; opponent: number };
}

export interface CardRevealedPayload {
  cardIndex: number;
  symbol: string;
  playerId: string;
}

export interface MatchFoundPayload {
  card1: number;
  card2: number;
  symbol: string;
  playerId: string;
  scores: Record<string, number>;
}

export interface MismatchPayload {
  card1: number;
  card2: number;
  symbol1: string;
  symbol2: string;
  nextTurnPlayerId: string;
}

export interface GameOverPayload {
  winnerId: string | null;
  isDraw: boolean;
  scores: Record<string, number>;
  matchId: string;
  eloChanges: Record<string, number>;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; difficulty: Difficulty }) => void;
  'room:joined': (data: RoomState) => void;
  'room:player-joined': (data: { player: PublicPlayer }) => void;
  'room:error': (data: { message: string }) => void;
  'matchmaking:queued': () => void;
  'matchmaking:matched': (data: { roomCode: string; opponent: PublicPlayer }) => void;
  'game:start': (data: GameStartPayload) => void;
  'game:card-revealed': (data: CardRevealedPayload) => void;
  'game:match-found': (data: MatchFoundPayload) => void;
  'game:mismatch': (data: MismatchPayload) => void;
  'game:turn-change': (data: { activePlayerId: string }) => void;
  'game:over': (data: GameOverPayload) => void;
  'game:opponent-disconnected': (data: { timeoutSecs: number }) => void;
  'game:opponent-reconnected': () => void;
  'game:forfeited': (data: { winnerId: string }) => void;
  'game:state-restored': (data: {
    difficulty: Difficulty;
    cols: number;
    totalPairs: number;
    totalCards: number;
    yourTurn: boolean;
    opponent: PublicPlayer;
    scores: Record<string, number>;
    revealedCards: Array<{ index: number; symbol: string }>;
    matchedCards: number[];
    currentFlips: Array<{ index: number; symbol: string }>;
  }) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { difficulty: Difficulty }) => void;
  'room:join': (data: { code: string }) => void;
  'matchmaking:join': (data: { difficulty: Difficulty }) => void;
  'matchmaking:leave': () => void;
  'game:flip': (data: { cardIndex: number }) => void;
  'game:rematch': () => void;
}
