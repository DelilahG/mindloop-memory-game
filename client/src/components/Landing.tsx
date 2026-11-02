import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Sparkles, Heart, Swords } from 'lucide-react';
import { CardSymbol, Logo } from '../CardSymbols';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const navigate = useNavigate();
  const { player } = useAuth();

  const goSolo = () => navigate('/solo');
  const goMultiplayer = () => navigate(player ? '/lobby' : '/login');

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo-group">
          <Logo />
          <span className="logo-text">MindLoop</span>
        </div>
        <div className="nav-links">
          <button type="button" className="nav-link" onClick={() => navigate('/')}>Home</button>
          <button type="button" className="nav-link" onClick={goSolo}>Solo</button>
          <button type="button" className="nav-link" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        </div>
        <div className="nav-actions">
          {player ? (
            <button type="button" className="btn-primary btn-nav" onClick={() => navigate('/lobby')}>
              Lobby <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-primary btn-nav" onClick={() => navigate('/login')}>
              Sign In <ArrowRight size={16} />
            </button>
          )}
        </div>
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
          <div className="landing-cta-group">
            <button type="button" className="btn-primary btn-large" onClick={goSolo}>
              Solo Play <ArrowRight size={18} />
            </button>
            <button type="button" className="btn-secondary btn-large" onClick={goMultiplayer}>
              <Swords size={18} /> Multiplayer
            </button>
          </div>
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
