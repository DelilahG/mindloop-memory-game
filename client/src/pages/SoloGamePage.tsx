import { useState, useCallback, useRef, useEffect } from 'react';
import type { Difficulty, CardData } from '../types';
import { DIFFICULTY_CONFIG, SYMBOLS } from '../types';
import { createDeck, formatTime } from '../game/engine';
import { SoundManager } from '../sounds';
import { LevelSelect } from '../components/LevelSelect';
import { GameBoard } from '../components/GameBoard';
import { GameOver } from '../components/GameOver';
import { ArrowLeft, Clock, RotateCcw, Volume2, VolumeX } from 'lucide-react';

type SoloScreen = 'levels' | 'game' | 'complete';

export function SoloGamePage() {
  const [screen, setScreen] = useState<SoloScreen>('levels');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<CardData[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [firstFlipped, setFirstFlipped] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [time, setTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef(new SoundManager());

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  useEffect(() => {
    soundRef.current.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (matchedPairs > 0 && matchedPairs === totalPairs) {
      setIsTimerRunning(false);
      soundRef.current.play('complete');
      const id = setTimeout(() => setScreen('complete'), 1000);
      return () => clearTimeout(id);
    }
  }, [matchedPairs, totalPairs]);

  const startGame = useCallback((diff: Difficulty) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const config = DIFFICULTY_CONFIG[diff];
    setDifficulty(diff);
    setCards(createDeck(SYMBOLS, config.pairs));
    setMoves(0);
    setMatchedPairs(0);
    setTotalPairs(config.pairs);
    setFirstFlipped(null);
    setIsLocked(false);
    setTime(0);
    setIsTimerRunning(false);
    setScreen('game');
  }, []);

  const handleCardClick = useCallback((cardId: number) => {
    if (isLocked) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    if (!isTimerRunning) setIsTimerRunning(true);
    soundRef.current.play('flip');

    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    if (firstFlipped === null) {
      setFirstFlipped(cardId);
    } else {
      setMoves(m => m + 1);
      setIsLocked(true);

      const firstCard = cards.find(c => c.id === firstFlipped)!;

      if (firstCard.symbol === card.symbol) {
        timeoutRef.current = setTimeout(() => {
          soundRef.current.play('match');
          setCards(prev => prev.map(c =>
            c.id === firstFlipped || c.id === cardId
              ? { ...c, isMatched: true }
              : c
          ));
          setMatchedPairs(m => m + 1);
          setFirstFlipped(null);
          setIsLocked(false);
        }, 600);
      } else {
        timeoutRef.current = setTimeout(() => {
          soundRef.current.play('mismatch');
          setCards(prev => prev.map(c =>
            c.id === firstFlipped || c.id === cardId
              ? { ...c, isFlipped: false }
              : c
          ));
          setFirstFlipped(null);
          setIsLocked(false);
        }, 1000);
      }
    }
  }, [cards, firstFlipped, isLocked, isTimerRunning]);

  const restart = useCallback(() => startGame(difficulty), [difficulty, startGame]);

  const goToMenu = useCallback(() => {
    setIsTimerRunning(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setScreen('levels');
  }, []);

  const difficultyIndex = (['easy', 'medium', 'hard', 'expert'] as const).indexOf(difficulty) + 1;

  return (
    <>
      {screen === 'levels' && (
        <LevelSelect onSelect={startGame} onBack={() => window.history.back()} />
      )}

      {screen === 'game' && (
        <div className="game-screen">
          <header className="game-header">
            <button type="button" className="btn-back" onClick={goToMenu}>
              <ArrowLeft size={20} /> Back
            </button>
            <div className="game-info">
              <h2 className="game-level">Level {difficultyIndex}</h2>
              <p className="game-subtitle">Find all matching pairs</p>
            </div>
            <div className="game-controls">
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSoundEnabled(s => !s)}
                aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button type="button" className="btn-icon" onClick={restart} aria-label="Restart game">
                <RotateCcw size={18} />
              </button>
              <div className="timer">
                <Clock size={16} />
                <span>{formatTime(time)}</span>
              </div>
            </div>
          </header>

          <GameBoard
            cards={cards}
            difficulty={difficulty}
            onCardClick={handleCardClick}
          />

          <footer className="game-footer">
            <span>Moves: {moves}</span>
            <span>Pairs: {matchedPairs}/{totalPairs}</span>
          </footer>
        </div>
      )}

      {screen === 'complete' && (
        <GameOver
          time={time}
          moves={moves}
          totalPairs={totalPairs}
          onPlayAgain={restart}
          onBackToMenu={goToMenu}
        />
      )}
    </>
  );
}
