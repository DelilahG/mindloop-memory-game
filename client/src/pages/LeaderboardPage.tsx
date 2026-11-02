import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@mindloop/shared';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './LeaderboardPage.css';

const PAGE_SIZE = 20;

export function LeaderboardPage() {
  const { player } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get<{ entries: LeaderboardEntry[]; total: number }>(
        `/api/leaderboard?page=${p}&limit=${PAGE_SIZE}`
      );
      setEntries(data.entries);
      setTotal(data.total);
      setPage(p);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <Link to="/lobby" className="btn-back">
          <ArrowLeft size={20} /> Back to Lobby
        </Link>
      </header>

      <main className="leaderboard-main">
        <div className="leaderboard-title-row">
          <Trophy size={24} className="leaderboard-icon" />
          <h1>Leaderboard</h1>
        </div>

        {loading && entries.length === 0 ? (
          <p className="leaderboard-empty">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="leaderboard-empty">No players yet. Be the first!</p>
        ) : (
          <>
            <div className="leaderboard-table">
              <div className="lb-row lb-row--header">
                <span className="lb-rank">#</span>
                <span className="lb-name">Player</span>
                <span className="lb-elo">Elo</span>
                <span className="lb-stat">W</span>
                <span className="lb-stat">GP</span>
              </div>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`lb-row${entry.id === player?.id ? ' lb-row--me' : ''}`}
                >
                  <span className="lb-rank">
                    {entry.rank <= 3 ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.rank] : entry.rank}
                  </span>
                  <span className="lb-name">
                    <span className="lb-avatar" style={{ background: entry.avatarColor }} />
                    <span className="lb-display-name">{entry.displayName}</span>
                    <span className="lb-username">@{entry.username}</span>
                  </span>
                  <span className="lb-elo">{entry.eloRating}</span>
                  <span className="lb-stat">{entry.gamesWon}</span>
                  <span className="lb-stat">{entry.gamesPlayed}</span>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="lb-pagination">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => fetchPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="lb-page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => fetchPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
