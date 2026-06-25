import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Match, Goal } from '../types';

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Match not found');
        return res.json() as Promise<Match>;
      })
      .then(setMatch)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-12 text-center text-slate-400">Loading match...</div>;
  if (error) return <div className="py-12 text-center text-red-400">Error: {error}</div>;
  if (!match) return <div className="py-12 text-center text-slate-500">Match not found.</div>;

  // Extract year from match id (e.g., "2018-5" → year=2018)
  const year = id?.split('-')[0] ?? '';

  const renderGoals = (goals: Goal[] | null | undefined, teamName: string) => {
    if (!goals || goals.length === 0) return null;
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-4">
        <h3 className="mb-2 text-sm font-medium text-slate-400">{teamName} Scorers</h3>
        <ul className="space-y-1">
          {goals.map((g, i) => (
            <li key={i} className="text-sm text-slate-300">
              {g.name} {g.minute}&prime;
              {g.penalty ? <span className="ml-1 text-xs text-yellow-500">(P)</span> : ''}
              {g.owngoal ? <span className="ml-1 text-xs text-red-500">(OG)</span> : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-0 sm:px-0">
      <Link
        to={`/tournaments/${year}/matches`}
        className="mb-4 inline-flex min-h-[44px] items-center text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back to Matches
      </Link>

      <h1 className="mb-6 text-xl font-bold text-white md:text-2xl">
        {match.team1} vs {match.team2}
      </h1>

      {/* Score display */}
      <div className="mb-6 flex items-center justify-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 md:gap-8 md:p-8">
        <span className="flex-1 truncate text-right text-sm font-bold text-white md:text-lg">
          {match.team1}
        </span>
        <span className="shrink-0 font-mono text-xl font-bold text-blue-400 md:text-3xl">
          {match.score.ft[0]} &ndash; {match.score.ft[1]}
        </span>
        <span className="flex-1 truncate text-left text-sm font-bold text-white md:text-lg">
          {match.team2}
        </span>
      </div>

      {/* Match meta */}
      <div className="mb-6 grid grid-cols-1 gap-2 rounded-xl border border-slate-700/50 bg-slate-800/80 p-4 sm:grid-cols-2">
        {match.date && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Date:</span> {match.date}
          </p>
        )}
        {match.time && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Time:</span> {match.time}
          </p>
        )}
        {match.round && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Round:</span> {match.round}
          </p>
        )}
        {match.group && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Group:</span> {match.group}
          </p>
        )}
        {match.ground && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Venue:</span> {match.ground}
          </p>
        )}
        <p className="text-sm text-slate-300">
          <span className="text-slate-500">Half Time:</span> {match.score.ht[0]} &ndash;{' '}
          {match.score.ht[1]}
        </p>
      </div>

      {/* Goals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderGoals(match.goals1, match.team1)}
        {renderGoals(match.goals2, match.team2)}
      </div>
    </div>
  );
}
