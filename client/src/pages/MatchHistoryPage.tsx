import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, History } from 'lucide-react';
import type { MatchSummary } from '@mindloop/shared';
import { api } from '../api/client';
import './MatchHistoryPage.css';

const PAGE_SIZE = 15;

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function resultBadge(match: MatchSummary): { text: string; className: string } {
  if (match.isDraw) return { text: 'Draw', className: 'badge--draw' };
  if (match.won) return { text: 'Win', className: 'badge--win' };
  return { text: 'Loss', className: 'badge--loss' };
}

export function MatchHistoryPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get<{ matches: MatchSummary[]; total: number }>(
        `/api/matches?page=${p}&limit=${PAGE_SIZE}`
      );
      setMatches(data.matches);
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
    <div className="history-page">
      <header className="history-header">
        <Link to="/lobby" className="btn-back">
          <ArrowLeft size={20} /> Back to Lobby
        </Link>
      </header>

      <main className="history-main">
        <div className="history-title-row">
          <History size={24} className="history-icon" />
          <h1>Match History</h1>
        </div>

        {loading && matches.length === 0 ? (
          <p className="history-empty">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="history-empty">No matches yet. Play your first game!</p>
        ) : (
          <>
            <div className="history-list">
              {matches.map(match => {
                const badge = resultBadge(match);
                return (
                  <div key={match.id} className="history-item">
                    <div className="history-item-top">
                      <span className={`history-badge ${badge.className}`}>{badge.text}</span>
                      <span className="history-difficulty">{match.difficulty}</span>
                      <span className="history-date">{formatDate(match.finishedAt)}</span>
                    </div>
                    <div className="history-item-body">
                      <span className="history-opponent">
                        vs <strong>{match.opponent.displayName}</strong>
                      </span>
                      <span className="history-score">
                        {match.myPairs} – {match.opponentPairs}
                      </span>
                      <span className="history-duration">{formatDuration(match.durationSecs)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => fetchPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="history-page-info">
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
