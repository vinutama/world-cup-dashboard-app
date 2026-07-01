import { useState, useEffect } from 'react';
import type { GoldenBootPlayer } from '../types/oracle';

// ─ Rank Helpers ────────────────────────────────
const rankBadge = (i: number) => {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
};

const rankColor = (i: number) => {
  if (i === 0) return 'from-amber-300 to-yellow-600';
  if (i === 1) return 'from-slate-300 to-slate-500';
  if (i === 2) return 'from-amber-600 to-orange-800';
  return 'from-zinc-400 to-zinc-600';
};

// ─ Skeletons ───────────────────────────────────
function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[1, 0, 2].map((pos) => (
        <div
          key={pos}
          className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 text-center animate-pulse"
        >
          <div className="w-12 h-12 mx-auto bg-zinc-800 rounded-full mb-3" />
          <div className="h-5 w-24 mx-auto bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-16 mx-auto bg-zinc-800 rounded mb-4" />
          <div className="h-3 w-full bg-zinc-800 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 animate-pulse"
        >
          <div className="w-5 h-5 bg-zinc-800 rounded" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-28 bg-zinc-800 rounded mb-2" />
            <div className="h-2 w-full bg-zinc-800 rounded-full" />
          </div>
          <div className="h-5 w-10 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─ Empty State ─────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <span className="text-5xl mb-4">🥾</span>
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-1">Check back closer to the tournament</p>
    </div>
  );
}

// ─ Podium Card ─────────────────────────────────
function PodiumCard({ player, rank }: { player: GoldenBootPlayer; rank: number }) {
  const barGradient = rank === 0
    ? 'from-amber-400 via-yellow-500 to-amber-600'
    : rank === 1
      ? 'from-slate-300 via-gray-400 to-slate-500'
      : 'from-amber-600 via-orange-700 to-amber-800';

  const glowColor = rank === 0
    ? 'rgba(251,191,36,0.3)'
    : rank === 1
      ? 'rgba(148,163,184,0.25)'
      : 'rgba(217,119,6,0.25)';

  const borderGlow = rank === 0
    ? 'border-amber-500/40 hover:border-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.08)]'
    : rank === 1
      ? 'border-slate-500/30 hover:border-slate-400/50'
      : 'border-amber-700/30 hover:border-amber-600/50';

  return (
    <div
      className={`relative bg-zinc-900/60 backdrop-blur-xl border ${borderGlow} rounded-2xl p-6 text-center transition-all duration-500 hover:-translate-y-1 group ${rank === 0 ? 'md:scale-105 z-10' : ''}`}
    >
      {/* Top rank badge */}
      <div className="text-4xl mb-3">{rankBadge(rank)}</div>

      {/* Player name */}
      <h3 className="text-lg font-bold text-zinc-100 mb-1 truncate group-hover:text-white transition-colors">
        {player.player}
      </h3>

      {/* Probability big number */}
      <div className="text-4xl font-black tabular-nums mb-4 bg-gradient-to-br bg-clip-text text-transparent from-cyan-300 to-blue-500">
        {player.probability}%
      </div>

      {/* Neon bar */}
      <div className="w-full h-3 bg-zinc-800/80 rounded-full overflow-hidden p-[2px]">
        <div
          className={`h-full bg-gradient-to-r ${barGradient} rounded-full transition-all duration-1000 ease-out`}
          style={{
            width: `${player.probability}%`,
            boxShadow: `0 0 16px ${glowColor}`,
          }}
        />
      </div>

      {/* Label */}
      <p className="text-[11px] uppercase tracking-widest text-zinc-600 mt-3">
        Win Probability
      </p>
    </div>
  );
}

// ─ Player Row ──────────────────────────────────
function PlayerRow({ player, i }: { player: GoldenBootPlayer; i: number }) {
  const gradient = rankColor(i);
  return (
    <div className="group flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 transition-all duration-300 hover:border-cyan-500/50 hover:bg-zinc-800/40 hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]">
      {/* Rank */}
      <span className={`w-8 text-center text-lg font-black bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>
        {i + 1}
      </span>

      {/* Name + Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
            {player.player}
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-1000 ease-out"
            style={{ width: `${player.probability}%` }}
          />
        </div>
      </div>

      {/* Probability */}
      <span className="text-lg font-bold tabular-nums text-cyan-400 w-14 text-right">
        {player.probability}%
      </span>
    </div>
  );
}

// ─ Main Component ──────────────────────────────
export default function GoldenBoot() {
  const [players, setPlayers] = useState<GoldenBootPlayer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch('/api/v1/predictions/golden-boot')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GoldenBootPlayer[]) => {
        if (!cancelled) {
          setPlayers(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const podium = players?.slice(0, 3) ?? [];
  const rest = players?.slice(3) ?? [];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans relative animate-fade-in">
      {/* Ambient cyber orb — gold hue for Golden Boot */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-zinc-100 tracking-tight flex items-center gap-3">
          <span className="text-amber-400">🥾</span> Golden{' '}
          <span className="text-amber-400">Boot</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1 ml-1">
          Top players predicted to be the 2026 World Cup top goalscorer — powered by Polymarket
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm p-3 rounded-xl max-w-7xl mx-auto">
          Could not load Golden Boot predictions. Please try again later.
        </div>
      )}

      {/* Empty */}
      {!loading && !error && players !== null && players.length === 0 && (
        <EmptyState message="No Golden Boot predictions available" />
      )}

      {/* Loading */}
      {loading && (
        <div className="max-w-7xl mx-auto">
          <PodiumSkeleton />
          <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
            <span className="text-amber-400">◈</span> Full Leaderboard
          </h2>
          <ListSkeleton />
        </div>
      )}

      {/* Content */}
      {!loading && !error && players !== null && players.length > 0 && (
        <div className="max-w-7xl mx-auto">
          {/* === Podium Section === */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
              <span className="text-amber-400">◈</span> Golden Podium
              <span className="text-xs text-zinc-500 font-normal ml-auto">Top 3</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Silver (2nd) */}
              {podium.length > 1 && <PodiumCard player={podium[1]} rank={1} />}

              {/* Gold (1st) — centered, slightly taller */}
              {podium.length > 0 && <PodiumCard player={podium[0]} rank={0} />}

              {/* Bronze (3rd) */}
              {podium.length > 2 && <PodiumCard player={podium[2]} rank={2} />}
            </div>
          </div>

          {/* === Full Leaderboard === */}
          {rest.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
                <span className="text-cyan-400">◈</span> Full Leaderboard
                <span className="text-xs text-zinc-500 font-normal ml-auto">Remaining Contenders</span>
              </h2>
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl overflow-hidden shadow-2xl">
                {/* Scanner line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
                <div className="space-y-3">
                  {rest.map((player, i) => (
                    <PlayerRow key={player.player} player={player} i={i + 3} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* If only 1-3 players, show all of them in podium */}
          {rest.length === 0 && players.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2">
                <span className="text-cyan-400">◈</span> All Contenders
              </h2>
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
                <div className="space-y-3">
                  {players.map((player, i) => (
                    <PlayerRow key={player.player} player={player} i={i} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
