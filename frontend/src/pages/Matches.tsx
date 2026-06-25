import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { PaginatedMatches, MatchWithIndex } from '../types';

type SortOrder = 'asc' | 'desc';

export default function Matches() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const [matches, setMatches] = useState<MatchWithIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 5;

  // Fetch paginated matches with backend sort
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/tournaments/${id}/matches?page=${page}&per_page=${perPage}&sort=${sortOrder}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch matches');
        return res.json() as Promise<PaginatedMatches>;
      })
      .then((data) => {
        setMatches(data.matches);
        setTotalPages(data.total_pages);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, page, sortOrder]);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    setSearchParams({ page: clamped.toString() });
  };

  const toggleSort = () => {
    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    setPage(1);
    setSearchParams({ page: '1' });
  };

  if (loading) return <div className="py-12 text-center text-slate-400">Loading matches...</div>;
  if (error) return <div className="py-12 text-center text-red-400">Error: {error}</div>;

  return (
    <div>
      <Link
        to="/tournaments"
        className="mb-4 inline-flex min-h-[44px] items-center text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back to Tournaments
      </Link>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white md:text-2xl">World Cup {id} — Matches</h1>

        <button
          onClick={toggleSort}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          title={sortOrder === 'asc' ? 'Sorted ascending — click to sort descending' : 'Sorted descending — click to sort ascending'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="hidden sm:inline">Date</span>
        </button>
      </div>

      {matches.length === 0 && (
        <p className="py-8 text-center text-slate-500">No matches found.</p>
      )}

      <div className="flex flex-col gap-3">
        {matches.map(({ match: m, original_index }) => {
          const matchId = `${id}-${original_index}`;
          return (
            <Link
              to={`/matches/${matchId}`}
              key={matchId}
              className="block rounded-xl border border-slate-700/50 bg-slate-800/80 p-3 transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 sm:p-4"
            >
              <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{m.round}</span>
                <span>{m.date}</span>
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                <span className="flex-1 truncate text-right text-sm font-semibold text-white sm:text-base">
                  {m.team1}
                </span>
                <span className="shrink-0 font-mono text-lg font-bold text-blue-400 sm:text-xl">
                  {m.score.ft[0]} &ndash; {m.score.ft[1]}
                </span>
                <span className="flex-1 truncate text-left text-sm font-semibold text-white sm:text-base">
                  {m.team2}
                </span>
              </div>
              {m.ground && (
                <div className="mt-2 truncate text-center text-xs text-slate-500">{m.ground}</div>
              )}
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="min-h-[44px] w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
