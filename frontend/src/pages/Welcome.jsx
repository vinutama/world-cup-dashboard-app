import { Link } from 'react-router-dom';

export default function Welcome() {
  return (
    <div className="welcome">
      <h1>FIFA World Cup Dashboard</h1>
      <p>
        Browse through every FIFA World Cup tournament from 1930 to today. 
        View match results, goal scorers, and tournament details.
      </p>
      <div className="cta">
        <Link to="/tournaments" className="btn btn-primary">
          Browse Tournaments
        </Link>
      </div>
    </div>
  );
}
