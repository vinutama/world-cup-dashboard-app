import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404 — Page Not Found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/" className="btn">Go Home</Link>
    </div>
  );
}
