export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Screen = 'landing' | 'levels' | 'game' | 'complete';

export interface CardData {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface DifficultyConfig {
  pairs: number;
  cols: number;
  label: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { pairs: 6, cols: 4, label: 'Easy' },
  medium: { pairs: 8, cols: 4, label: 'Medium' },
  hard: { pairs: 10, cols: 5, label: 'Hard' },
  expert: { pairs: 15, cols: 6, label: 'Expert' },
};

export const SYMBOLS = [
  'star', 'moon', 'cat', 'flower', 'leaf',
  'diamond', 'butterfly', 'heart', 'sun', 'cloud',
  'mushroom', 'eye', 'crystal', 'feather', 'drop',
] as const;

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
