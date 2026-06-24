import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="app-logo">
          ⚽ World Cup Dashboard
        </Link>
        <nav>
          <Link to="/tournaments">Tournaments</Link>
        </nav>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
}
