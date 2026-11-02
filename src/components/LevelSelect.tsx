import { ArrowLeft } from 'lucide-react';
import type { Difficulty } from '../types';
import { DIFFICULTY_ORDER, DIFFICULTY_CONFIG } from '../types';
import { Logo } from '../CardSymbols';

interface Props {
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}

export function LevelSelect({ onSelect, onBack }: Props) {
  return (
    <div className="level-select">
      <div className="level-header">
        <div className="logo-group">
          <Logo />
          <span className="logo-text">MindLoop</span>
        </div>
      </div>

      <div className="level-content">
        <h1>Choose a Level</h1>
        <p className="level-subtitle">Start easy, get better, challenge yourself.</p>

        <div className="level-grid">
          {DIFFICULTY_ORDER.map((diff, i) => (
            <button
              key={diff}
              type="button"
              className="level-card"
              onClick={() => onSelect(diff)}
            >
              <span className="level-number">{i + 1}</span>
              <span className="level-name">{DIFFICULTY_CONFIG[diff].label}</span>
            </button>
          ))}
        </div>

        <svg className="level-decoration" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
          <polygon points="32,0 34,14 48,6 38,18 52,16 40,24 56,28 42,30 56,36 40,36 52,48 38,42 48,58 34,50 32,64 30,50 16,58 26,42 12,48 24,36 8,36 22,30 8,28 24,24 12,16 26,18 16,6 30,14" />
        </svg>
      </div>

      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Home
      </button>
    </div>
  );
}
