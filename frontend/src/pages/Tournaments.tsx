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

  if (loading) return <div className="loading">Loading tournaments...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="tournaments-page">
      <h1>World Cup Tournaments</h1>

      <div className="filter-bar">
        <label htmlFor="year-filter">Filter by year:</label>
        <select
          id="year-filter"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {tournaments.length === 0 && <p className="empty">No tournaments found.</p>}

      <div className="tournament-list">
        {tournaments.map((t) => (
          <Link
            to={`/tournaments/${t.year}/matches`}
            key={t.year}
            className="tournament-card"
          >
            <h2>{t.name}</h2>
            <span className="year">{t.year}</span>
            <span className="matches-count">{t.matches?.length ?? 0} matches</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
