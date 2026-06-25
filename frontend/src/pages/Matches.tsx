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

  if (loading) return <div className="py-12 text-center text-slate-400">Loading matches...</div>;
  if (error) return <div className="py-12 text-center text-red-400">Error: {error}</div>;

  return (
    <div>
      <Link
        to="/tournaments"
        className="mb-4 inline-block text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back to Tournaments
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-white">World Cup {id} — Matches</h1>

      {matches.length === 0 && (
        <p className="py-8 text-center text-slate-500">No matches found.</p>
      )}

      <div className="flex flex-col gap-3">
        {matches.map((m, idx) => {
          const matchId = `${id}-${idx}`;
          return (
            <Link
              to={`/matches/${matchId}`}
              key={matchId}
              className="block rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 transition-all hover:border-blue-500/50"
            >
              <div className="mb-2 flex gap-3 text-xs text-slate-500">
                <span>{m.round}</span>
                <span>{m.date}</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-semibold text-white">{m.team1}</span>
                <span className="font-mono text-xl font-bold text-blue-400">
                  {m.score.ft[0]} &ndash; {m.score.ft[1]}
                </span>
                <span className="font-semibold text-white">{m.team2}</span>
              </div>
              {m.ground && (
                <div className="mt-2 text-center text-xs text-slate-500">{m.ground}</div>
              )}
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
