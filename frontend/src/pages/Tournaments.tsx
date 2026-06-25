import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Tournament } from '../types';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = selectedYear ? `?year=${selectedYear}` : '';
    fetch(`/api/tournaments${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        return res.json() as Promise<Tournament[]>;
      })
      .then((data) => {
        setTournaments(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedYear]);

  useEffect(() => {
    fetch('/api/years')
      .then((res) => res.json() as Promise<number[]>)
      .then(setYears)
      .catch(() => {});
  }, []);

  if (loading) return <div className="py-12 text-center text-slate-400">Loading tournaments...</div>;
  if (error) return <div className="py-12 text-center text-red-400">Error: {error}</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">World Cup Tournaments</h1>

      <div className="mb-6 flex items-center gap-2">
        <label htmlFor="year-filter" className="text-sm text-slate-400">
          Filter by year:
        </label>
        <select
          id="year-filter"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {tournaments.length === 0 && (
        <p className="py-8 text-center text-slate-500">No tournaments found.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <Link
            to={`/tournaments/${t.year}/matches`}
            key={t.year}
            className="group rounded-xl border border-slate-700/50 bg-slate-800/80 p-5 transition-all hover:border-blue-500/50 hover:bg-slate-800"
          >
            <h2 className="mb-1 text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              {t.name}
            </h2>
            <span className="text-sm text-slate-500">{t.year}</span>
            <span className="mt-2 block text-xs font-medium text-blue-400">
              {t.matches?.length ?? 0} matches →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
