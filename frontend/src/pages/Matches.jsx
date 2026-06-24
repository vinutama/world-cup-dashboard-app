import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function Matches() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/tournaments/${id}/matches`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch matches');
        return res.json();
      })
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
            <Link to={`/matches/${matchId}`} key={matchId} className="match-card">
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
    </div>
  );
}
