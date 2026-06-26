import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Home', exact: true },
  { path: '/tournaments', label: 'Tournaments' },
  { path: '/goal-avalanche', label: 'Goal Avalanche' },
];

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-800/30 bg-blue-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold text-white transition-colors hover:text-blue-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm shadow-lg shadow-blue-500/20">
              ⚽
            </span>
            <span className="hidden sm:inline">World Cup Dashboard</span>
            <span className="sm:hidden">WC</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-h-[44px] items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive(item.path, item.exact)
                    ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:bg-blue-900/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
