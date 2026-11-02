import { ArrowRight, Brain, Sparkles, Heart } from 'lucide-react';
import { CardSymbol, Logo } from '../CardSymbols';

interface Props {
  onPlay: () => void;
}

export function Landing({ onPlay }: Props) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo-group">
          <Logo />
          <span className="logo-text">MindLoop</span>
        </div>
        <div className="nav-links">
          <button type="button" className="nav-link">Home</button>
          <button type="button" className="nav-link" onClick={onPlay}>Play</button>
          <button type="button" className="nav-link">About</button>
        </div>
        <button type="button" className="btn-primary btn-nav" onClick={onPlay}>
          Start Game <ArrowRight size={16} />
        </button>
      </nav>

      <main className="landing-main">
        <div className="landing-hero">
          <h1 className="hero-title">
            Small<br />cards.<br />
            <em>Big focus.</em>
          </h1>
          <p className="hero-subtitle">
            A simple memory game to help you<br />focus, relax, and train your mind.
          </p>
          <button type="button" className="btn-primary btn-large" onClick={onPlay}>
            Play Now <ArrowRight size={18} />
          </button>
          <div className="landing-features">
            <div className="feature">
              <Brain size={20} />
              <div>
                <strong>Boost</strong>
                <span>memory</span>
              </div>
            </div>
            <div className="feature">
              <Sparkles size={20} />
              <div>
                <strong>Improve</strong>
                <span>focus</span>
              </div>
            </div>
            <div className="feature">
              <Heart size={20} />
              <div>
                <strong>Have</strong>
                <span>fun</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-cards-display">
          <div className="hero-card hc-1">
            <div className="hero-card-face hero-card-back">
              <div className="card-back-pattern" />
            </div>
          </div>
          <div className="hero-card hc-2">
            <div className="hero-card-face hero-card-front">
              <CardSymbol symbol="star" className="hero-symbol" />
            </div>
          </div>
          <div className="hero-card hc-3">
            <div className="hero-card-face hero-card-front">
              <CardSymbol symbol="flower" className="hero-symbol" />
            </div>
          </div>
          <div className="hero-card hc-4">
            <div className="hero-card-face hero-card-front">
              <CardSymbol symbol="cat" className="hero-symbol" />
            </div>
          </div>
          <div className="hero-card hc-5">
            <div className="hero-card-face hero-card-front">
              <CardSymbol symbol="moon" className="hero-symbol" />
            </div>
          </div>

          <p className="annotation">
            Same cards.<br />New challenges.
          </p>

          <svg className="sparkle sparkle-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
          </svg>
          <svg className="sparkle sparkle-2" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <polygon points="8,0 9,7 16,8 9,9 8,16 7,9 0,8 7,7" />
          </svg>
        </div>
      </main>
    </div>
  );
}
