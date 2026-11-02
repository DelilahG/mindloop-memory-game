import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import type {
  Difficulty,
  PublicPlayer,
  GameStartPayload,
  CardRevealedPayload,
  MatchFoundPayload,
  MismatchPayload,
  GameOverPayload,
  ServerToClientEvents,
} from '@mindloop/shared';
import { DIFFICULTY_CONFIG } from '@mindloop/shared';
import type { CSSProperties } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { CardSymbol } from '../CardSymbols';
import { SoundManager } from '../sounds';
import './MultiplayerGamePage.css';

interface CardState {
  index: number;
  symbol: string | null;
  isFlipped: boolean;
  isMatched: boolean;
}

type Phase = 'waiting' | 'playing' | 'finished';

export function MultiplayerGamePage() {
  const { player } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const soundRef = useRef(new SoundManager());

  const [phase, setPhase] = useState<Phase>('waiting');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<CardState[]>([]);
  const [cols, setCols] = useState(4);
  const [myTurn, setMyTurn] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponent, setOpponent] = useState<PublicPlayer | null>(null);
  const [totalPairs, setTotalPairs] = useState(0);
  const [result, setResult] = useState<GameOverPayload | null>(null);
  const [disconnectTimer, setDisconnectTimer] = useState<number | null>(null);
  const [time, setTime] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  const initBoard = useCallback((totalCards: number) => {
    const board: CardState[] = [];
    for (let i = 0; i < totalCards; i++) {
      board.push({ index: i, symbol: null, isFlipped: false, isMatched: false });
    }
    return board;
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onStart = (data: GameStartPayload) => {
      setPhase('playing');
      setDifficulty(data.difficulty);
      setCols(data.cols);
      setTotalPairs(data.totalPairs);
      setMyTurn(data.yourTurn);
      setOpponent(data.opponent);
      setMyScore(data.scores.you);
      setOpponentScore(data.scores.opponent);
      setCards(initBoard(data.totalCards));
      setTime(0);
    };

    const onCardRevealed = (data: CardRevealedPayload) => {
      soundRef.current.play('flip');
      setCards(prev => prev.map(c =>
        c.index === data.cardIndex
          ? { ...c, symbol: data.symbol, isFlipped: true }
          : c
      ));
    };

    const onMatchFound = (data: MatchFoundPayload) => {
      soundRef.current.play('match');
      setCards(prev => prev.map(c =>
        c.index === data.card1 || c.index === data.card2
          ? { ...c, symbol: data.symbol, isFlipped: true, isMatched: true }
          : c
      ));
      if (player) {
        setMyScore(data.scores[player.id] ?? 0);
        const oppId = Object.keys(data.scores).find(k => k !== player.id);
        if (oppId) setOpponentScore(data.scores[oppId]);
      }
    };

    const onMismatch = (data: MismatchPayload) => {
      soundRef.current.play('mismatch');
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          (c.index === data.card1 || c.index === data.card2) && !c.isMatched
            ? { ...c, isFlipped: false, symbol: null }
            : c
        ));
      }, 600);
      setMyTurn(player?.id === data.nextTurnPlayerId);
    };

    const onTurnChange = (data: { activePlayerId: string }) => {
      setMyTurn(player?.id === data.activePlayerId);
    };

    const onOver = (data: GameOverPayload) => {
      soundRef.current.play('complete');
      setPhase('finished');
      setResult(data);
    };

    const onOpponentDisconnected = (data: { timeoutSecs: number }) => {
      setDisconnectTimer(data.timeoutSecs);
    };

    const onOpponentReconnected = () => {
      setDisconnectTimer(null);
    };

    const onStateRestored = (data: Parameters<ServerToClientEvents['game:state-restored']>[0]) => {
      setPhase('playing');
      setDifficulty(data.difficulty);
      setCols(data.cols);
      setTotalPairs(data.totalPairs);
      setMyTurn(data.yourTurn);
      setOpponent(data.opponent);

      const board = initBoard(data.totalCards);

      for (const r of data.revealedCards) {
        board[r.index] = { ...board[r.index], symbol: r.symbol, isFlipped: true };
      }
      for (const idx of data.matchedCards) {
        board[idx] = { ...board[idx], isMatched: true };
      }
      for (const f of data.currentFlips) {
        board[f.index] = { ...board[f.index], symbol: f.symbol, isFlipped: true };
      }

      setCards(board);

      if (player) {
        setMyScore(data.scores[player.id] ?? 0);
        const oppId = Object.keys(data.scores).find(k => k !== player.id);
        if (oppId) setOpponentScore(data.scores[oppId]);
      }
    };

    const onForfeited = (data: { winnerId: string }) => {
      setPhase('finished');
      setResult({
        winnerId: data.winnerId,
        isDraw: false,
        scores: {},
        matchId: '',
        eloChanges: {},
      });
    };

    socket.on('game:start', onStart);
    socket.on('game:card-revealed', onCardRevealed);
    socket.on('game:match-found', onMatchFound);
    socket.on('game:mismatch', onMismatch);
    socket.on('game:turn-change', onTurnChange);
    socket.on('game:over', onOver);
    socket.on('game:opponent-disconnected', onOpponentDisconnected);
    socket.on('game:opponent-reconnected', onOpponentReconnected);
    socket.on('game:state-restored', onStateRestored);
    socket.on('game:forfeited', onForfeited);

    return () => {
      socket.off('game:start', onStart);
      socket.off('game:card-revealed', onCardRevealed);
      socket.off('game:match-found', onMatchFound);
      socket.off('game:mismatch', onMismatch);
      socket.off('game:turn-change', onTurnChange);
      socket.off('game:over', onOver);
      socket.off('game:opponent-disconnected', onOpponentDisconnected);
      socket.off('game:opponent-reconnected', onOpponentReconnected);
      socket.off('game:state-restored', onStateRestored);
      socket.off('game:forfeited', onForfeited);
    };
  }, [socket, player, initBoard]);

  useEffect(() => {
    if (disconnectTimer === null || disconnectTimer <= 0) return;
    const id = setInterval(() => {
      setDisconnectTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [disconnectTimer]);

  const handleCardClick = (index: number) => {
    if (!socket || !myTurn || phase !== 'playing') return;
    const card = cards[index];
    if (!card || card.isFlipped || card.isMatched) return;
    socket.emit('game:flip', { cardIndex: index });
  };

  const handleRematch = () => {
    if (!socket) return;
    socket.emit('game:rematch');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getResultText = () => {
    if (!result || !player) return '';
    if (result.isDraw) return 'Draw!';
    return result.winnerId === player.id ? 'You Win!' : 'You Lose';
  };

  const getEloChange = () => {
    if (!result || !player) return 0;
    return result.eloChanges[player.id] ?? 0;
  };

  if (phase === 'waiting') {
    return (
      <div className="mp-game">
        <div className="mp-waiting">
          <div className="searching-spinner" />
          <p>Waiting for game to start...</p>
          <button type="button" className="btn-secondary" onClick={() => navigate('/lobby')}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <div className="mp-game">
      <header className="mp-header">
        <button type="button" className="btn-back" onClick={() => navigate('/lobby')}>
          <ArrowLeft size={20} /> Leave
        </button>

        <div className="mp-scoreboard">
          <div className={`mp-player${myTurn ? ' mp-player--active' : ''}`}>
            <div className="mp-avatar" style={{ background: player?.avatarColor ?? '#a594d0' }} />
            <span className="mp-player-name">You</span>
            <span className="mp-player-score">{myScore}</span>
          </div>

          <div className="mp-vs">vs</div>

          <div className={`mp-player${!myTurn ? ' mp-player--active' : ''}`}>
            <div className="mp-avatar" style={{ background: opponent?.avatarColor ?? '#888' }} />
            <span className="mp-player-name">{opponent?.displayName ?? 'Opponent'}</span>
            <span className="mp-player-score">{opponentScore}</span>
          </div>
        </div>

        <div className="timer">
          <Clock size={16} />
          <span>{formatTime(time)}</span>
        </div>
      </header>

      <div className="mp-turn-indicator">
        {myTurn ? "Your turn" : `${opponent?.displayName ?? 'Opponent'}'s turn`}
      </div>

      {disconnectTimer !== null && (
        <div className="mp-disconnect-banner">
          Opponent disconnected. Waiting for reconnection... ({disconnectTimer}s)
        </div>
      )}

      <div
        className="game-grid"
        style={{ '--cols': cols || config.cols } as CSSProperties}
      >
        {cards.map(card => (
          <button
            key={card.index}
            type="button"
            className={`card${card.isFlipped ? ' is-flipped' : ''}${card.isMatched ? ' is-matched' : ''}`}
            onClick={() => handleCardClick(card.index)}
            disabled={card.isMatched || !myTurn}
            aria-label={card.isFlipped && card.symbol ? `${card.symbol} card` : 'Face-down card'}
          >
            <div className="card-inner">
              <div className="card-face card-back">
                <div className="card-back-pattern" />
              </div>
              <div className="card-face card-front">
                {card.symbol && <CardSymbol symbol={card.symbol} className="card-symbol" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      <footer className="game-footer">
        <span>Pairs: {myScore}/{totalPairs}</span>
        <span>Opponent: {opponentScore}/{totalPairs}</span>
      </footer>

      {phase === 'finished' && result && (
        <div className="mp-overlay">
          <div className="mp-result-card">
            <h1 className={`mp-result-title${result.winnerId === player?.id ? ' mp-result--win' : result.isDraw ? '' : ' mp-result--lose'}`}>
              {getResultText()}
            </h1>

            <div className="mp-result-scores">
              <div className="mp-result-score">
                <span className="stat-label">You</span>
                <span className="stat-value">{myScore}</span>
              </div>
              <div className="mp-result-score">
                <span className="stat-label">{opponent?.displayName ?? 'Opponent'}</span>
                <span className="stat-value">{opponentScore}</span>
              </div>
            </div>

            {getEloChange() !== 0 && (
              <p className={`mp-elo-change${getEloChange() > 0 ? ' mp-elo--up' : ' mp-elo--down'}`}>
                Elo: {getEloChange() > 0 ? '+' : ''}{getEloChange()}
              </p>
            )}

            <div className="mp-result-actions">
              <button type="button" className="btn-primary" onClick={handleRematch}>
                Play Again
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/lobby')}>
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
