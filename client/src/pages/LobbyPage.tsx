import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Play, Users, Search, Trophy, History, User, Copy, Check, X } from 'lucide-react';
import type { Difficulty, PublicPlayer } from '@mindloop/shared';
import { DIFFICULTY_CONFIG } from '@mindloop/shared';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { Logo } from '../CardSymbols';
import './LobbyPage.css';

type Panel = null | 'create' | 'join' | 'match';

export function LobbyPage() {
  const { player, logout } = useAuth();
  const { socket, isConnected, connect } = useSocket();
  const navigate = useNavigate();

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isConnected) connect();
  }, [isConnected, connect]);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (data: { roomCode: string }) => {
      setRoomCode(data.roomCode);
      setError('');
    };

    const onJoined = () => {
      setError('');
    };

    const onPlayerJoined = (_data: { player: PublicPlayer }) => {
      navigate('/multiplayer');
    };

    const onMatched = () => {
      setSearching(false);
      navigate('/multiplayer');
    };

    const onStart = () => {
      navigate('/multiplayer');
    };

    const onError = (data: { message: string }) => {
      setError(data.message);
      setSearching(false);
    };

    socket.on('room:created', onCreated);
    socket.on('room:joined', onJoined);
    socket.on('room:player-joined', onPlayerJoined);
    socket.on('matchmaking:matched', onMatched);
    socket.on('game:start', onStart);
    socket.on('room:error', onError);

    return () => {
      socket.off('room:created', onCreated);
      socket.off('room:joined', onJoined);
      socket.off('room:player-joined', onPlayerJoined);
      socket.off('matchmaking:matched', onMatched);
      socket.off('game:start', onStart);
      socket.off('room:error', onError);
    };
  }, [socket, navigate]);

  const openPanel = useCallback((panel: Panel) => {
    setActivePanel(panel);
    setError('');
    setRoomCode('');
    setJoinCode('');
    setSearching(false);
    setCopied(false);
  }, []);

  const handleCreate = () => {
    if (!socket) return;
    socket.emit('room:create', { difficulty });
  };

  const handleJoin = () => {
    if (!socket || joinCode.length !== 6) return;
    socket.emit('room:join', { code: joinCode.toUpperCase() });
  };

  const handleMatchmake = () => {
    if (!socket) return;
    setSearching(true);
    socket.emit('matchmaking:join', { difficulty });
  };

  const handleCancelMatch = () => {
    if (!socket) return;
    socket.emit('matchmaking:leave');
    setSearching(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const difficulties = Object.entries(DIFFICULTY_CONFIG) as [Difficulty, (typeof DIFFICULTY_CONFIG)[Difficulty]][];

  return (
    <div className="lobby">
      <header className="lobby-header">
        <Link to="/" className="logo-group">
          <Logo />
          <span className="logo-text">MindLoop</span>
        </Link>
        <div className="lobby-header-right">
          <span className="lobby-greeting">Hey, {player?.displayName ?? player?.username}</span>
          <button type="button" className="btn-back" onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="lobby-main">
        <h1 className="lobby-title">Play</h1>
        <p className="lobby-subtitle">Choose how you want to play</p>

        <div className="lobby-grid">
          <Link to="/solo" className="lobby-card lobby-card--accent">
            <Play size={28} />
            <span className="lobby-card-label">Solo Play</span>
            <span className="lobby-card-desc">Practice on your own</span>
          </Link>

          <button type="button" className={`lobby-card${activePanel === 'create' ? ' lobby-card--active' : ''}`} onClick={() => openPanel('create')}>
            <Users size={28} />
            <span className="lobby-card-label">Create Room</span>
            <span className="lobby-card-desc">Invite a friend</span>
          </button>

          <button type="button" className={`lobby-card${activePanel === 'join' ? ' lobby-card--active' : ''}`} onClick={() => openPanel('join')}>
            <Copy size={28} />
            <span className="lobby-card-label">Join Room</span>
            <span className="lobby-card-desc">Enter a room code</span>
          </button>

          <button type="button" className={`lobby-card${activePanel === 'match' ? ' lobby-card--active' : ''}`} onClick={() => openPanel('match')}>
            <Search size={28} />
            <span className="lobby-card-label">Find Match</span>
            <span className="lobby-card-desc">Play a random opponent</span>
          </button>
        </div>

        {error && (
          <div className="lobby-error">
            <X size={14} /> {error}
          </div>
        )}

        {activePanel === 'create' && (
          <div className="lobby-panel">
            {roomCode ? (
              <div className="lobby-panel-inner">
                <p className="lobby-panel-title">Room Created</p>
                <p className="lobby-panel-hint">Share this code with your opponent:</p>
                <div className="room-code-display">
                  <span className="room-code-text">{roomCode}</span>
                  <button type="button" className="btn-icon" onClick={copyCode} aria-label="Copy code">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="lobby-panel-hint">Waiting for opponent to join...</p>
              </div>
            ) : (
              <div className="lobby-panel-inner">
                <p className="lobby-panel-title">Select Difficulty</p>
                <div className="difficulty-select">
                  {difficulties.map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      className={`difficulty-btn${difficulty === key ? ' difficulty-btn--active' : ''}`}
                      onClick={() => setDifficulty(key)}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-primary" onClick={handleCreate} disabled={!isConnected}>
                  Create Room
                </button>
              </div>
            )}
          </div>
        )}

        {activePanel === 'join' && (
          <div className="lobby-panel">
            <div className="lobby-panel-inner">
              <p className="lobby-panel-title">Enter Room Code</p>
              <input
                className="lobby-input"
                type="text"
                maxLength={6}
                placeholder="ABC123"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                autoFocus
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleJoin}
                disabled={joinCode.length !== 6 || !isConnected}
              >
                Join Room
              </button>
            </div>
          </div>
        )}

        {activePanel === 'match' && (
          <div className="lobby-panel">
            <div className="lobby-panel-inner">
              {searching ? (
                <>
                  <div className="searching-indicator">
                    <div className="searching-spinner" />
                    <p className="lobby-panel-title">Searching for opponent...</p>
                  </div>
                  <button type="button" className="btn-secondary" onClick={handleCancelMatch}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="lobby-panel-title">Select Difficulty</p>
                  <div className="difficulty-select">
                    {difficulties.map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        className={`difficulty-btn${difficulty === key ? ' difficulty-btn--active' : ''}`}
                        onClick={() => setDifficulty(key)}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="btn-primary" onClick={handleMatchmake} disabled={!isConnected}>
                    Find Match
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="lobby-links">
          <Link to="/leaderboard" className="lobby-link">
            <Trophy size={18} /> Leaderboard
          </Link>
          <Link to="/matches" className="lobby-link">
            <History size={18} /> Match History
          </Link>
          <Link to="/profile" className="lobby-link">
            <User size={18} /> Profile
          </Link>
        </div>
      </main>
    </div>
  );
}
