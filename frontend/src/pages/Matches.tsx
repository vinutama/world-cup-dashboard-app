import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Match, PaginatedMatches } from '../types';

export default function Matches() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/tournaments/${id}/matches?page=${page}&per_page=${perPage}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch matches');
        return res.json() as Promise<PaginatedMatches>;
      })
      .then((data) => {
        setMatches(data.matches);
        setTotalPages(data.total_pages);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, page]);

  const goToPage = (p: number) => {
    setPage(p);
    setSearchParams({ page: p.toString() });
  };

  if (loading) return <div className="loading">Loading matches...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="matches-page">
      <Link to="/tournaments" className="back-link">&larr; Back to Tournaments</Link>
      <h1>World Cup {id} — Matches</h1>

      {matches.length === 0 && <p className="empty">No matches found.</p>}

      <div className="match-list">
        {matches.map((m, idx) => {
          const matchId = `${id}-${idx}`;
          return (
            <Link
              to={`/matches/${matchId}`}
              key={matchId}
              className="match-card"
            >
              <div className="match-info">
                <span className="match-round">{m.round}</span>
                <span className="match-date">{m.date}</span>
              </div>
              <div className="match-teams">
                <span className="team home">{m.team1}</span>
                <span className="score">
                  {m.score.ft[0]} &ndash; {m.score.ft[1]}
                </span>
                <span className="team away">{m.team2}</span>
              </div>
              {m.ground && <div className="match-venue">{m.ground}</div>}
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            &larr; Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
