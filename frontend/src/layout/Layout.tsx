import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
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
