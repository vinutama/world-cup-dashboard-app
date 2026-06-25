import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <header className="mb-8 flex items-center justify-between border-b border-slate-700/50 pb-4">
        <Link to="/" className="text-lg font-bold text-white hover:text-blue-400 transition-colors">
          ⚽ World Cup Dashboard
        </Link>
        <nav>
          <Link
            to="/tournaments"
            className="ml-4 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Tournaments
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
