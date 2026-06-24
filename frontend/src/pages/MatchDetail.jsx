import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Match not found');
        return res.json();
      })
      .then(setMatch)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading match...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!match) return <div className="empty">Match not found.</div>;

  // Extract year from match id (e.g., "2018-5" → year=2018)
  const year = id.split('-')[0];

  const renderGoals = (goals, teamName) => {
    if (!goals || goals.length === 0) return null;
    return (
      <div className="goals-list">
        <h3>{teamName} Scorers</h3>
        <ul>
          {goals.map((g, i) => (
            <li key={i}>
              {g.name} {g.minute}&prime;
              {g.penalty ? ' (P)' : ''}
              {g.owngoal ? ' (OG)' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="match-detail">
      <Link to={`/tournaments/${year}/matches`} className="back-link">
        &larr; Back to Matches
      </Link>

      <h1>
        {match.team1} vs {match.team2}
      </h1>

      <div className="match-score-big">
        <span className="team-score">{match.team1}</span>
        <span className="score">
          {match.score.ft[0]} &ndash; {match.score.ft[1]}
        </span>
        <span className="team-score">{match.team2}</span>
      </div>

      <div className="match-meta">
        {match.date && <p><strong>Date:</strong> {match.date}</p>}
        {match.time && <p><strong>Time:</strong> {match.time}</p>}
        {match.round && <p><strong>Round:</strong> {match.round}</p>}
        {match.group && <p><strong>Group:</strong> {match.group}</p>}
        {match.ground && <p><strong>Venue:</strong> {match.ground}</p>}
        <p><strong>Half Time:</strong> {match.score.ht[0]} &ndash; {match.score.ht[1]}</p>
      </div>

      <div className="goals-container">
        {renderGoals(match.goals1, match.team1)}
        {renderGoals(match.goals2, match.team2)}
      </div>
    </div>
  );
}
