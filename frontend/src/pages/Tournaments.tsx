import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Dropdown from '../components/Dropdown';
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

  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white md:text-2xl">World Cup Tournaments</h1>
        <Dropdown
          label="Filter by year"
          options={yearOptions}
          value={selectedYear}
          onChange={setSelectedYear}
        />
      </div>

      {tournaments.length === 0 && (
        <p className="py-8 text-center text-slate-500">No tournaments found.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <Link
            to={`/tournaments/${t.year}/matches`}
            key={t.year}
            className="group rounded-xl border border-slate-700/50 bg-slate-800/80 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5"
          >
            <h2 className="mb-1 text-lg font-semibold text-white transition-colors group-hover:text-blue-400">
              {t.name}
            </h2>
            <span className="text-sm text-slate-500">{t.year}</span>
            <span className="mt-3 block text-xs font-medium text-blue-400">
              {t.matches?.length ?? 0} matches →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
