import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { TimelineEvent, GoalAvalancheResponse } from '../types';
import { useInView } from '../hooks/useInView';

function TimelineBar({ minute }: { minute: number }) {
  const pct = Math.min((minute / 120) * 100, 100);
  return (
    <div className="mt-3">
      <div className="text-xs text-slate-500 mb-1">Match timeline</div>
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        {/* Progress track */}
        <div className="h-full bg-cyan-800/40 rounded-full" style={{ width: `${pct}%` }} />
        {/* Goal marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          style={{ left: `${pct}%`, marginLeft: '-6px' }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-0.5">
        <span>0&prime;</span>
        <span>{minute}&prime;</span>
        <span>120&prime;</span>
      </div>
    </div>
  );
}

function ExpandedDetails({ event }: { event: TimelineEvent }) {
  return (
    <div className="mt-4 pt-3 border-t border-white/10 transition-all duration-300">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-500">Stage</span>
          <div className="text-white font-medium">{event.round || 'N/A'}</div>
        </div>
        <div>
          <span className="text-slate-500">Full time</span>
          <div className="text-white font-medium">
            {event.teamA} {event.fullTime} {event.teamB}
          </div>
        </div>
      </div>
      <TimelineBar minute={event.minute} />
    </div>
  );
}

function TimelineCard({
  event,
  idx,
  isExpanded,
  onToggle,
}: {
  event: TimelineEvent;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isRight = idx % 2 === 0;
  const { ref, inView } = useInView<HTMLDivElement>({ once: true, threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`relative flex items-start mb-6 transition-all duration-500 ease-in-out ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${isRight ? 'flex-row' : 'flex-row-reverse'}`}
      style={{ transitionDelay: `${idx * 50}ms` }}
    >
      {/* Card */}
      <div className={`w-5/12 ${isRight ? 'text-right pr-8' : 'text-left pl-8'}`}>
        <div
          onClick={onToggle}
          className={`relative inline-block bg-white/5 backdrop-blur-md border rounded-xl p-4 shadow-xl text-left cursor-pointer select-none transition-all duration-300 hover:bg-white/10 ${
            event.isClustered
              ? 'border-orange-400/60 shadow-[0_0_15px_rgba(251,146,60,0.3)]'
              : 'border-white/10'
          } ${isExpanded ? 'bg-white/10 scale-[1.02]' : ''}`}
        >
          {/* Chaos Zone pulsing dot + tooltip */}
          {event.isClustered && (
            <div className="absolute -top-1.5 -right-1.5 z-10 group/dot">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              <div className="absolute right-0 top-full mt-1.5 opacity-0 invisible group-hover/dot:opacity-100 group-hover/dot:visible transition-all duration-200 pointer-events-none z-50">
                <div className="px-2 py-1 bg-slate-800 text-xs text-red-300 rounded border border-red-500/30 whitespace-nowrap shadow-lg shadow-red-500/10">
                  ⚡ Chaos Zone &mdash; multiple goals in a short window
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-cyan-400">{event.minute}&prime;</span>
            {event.isClustered && (
              <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                CHAOS
              </span>
            )}
          </div>
          <div className="text-white font-semibold text-lg">{event.scorer}</div>
          <div className="text-slate-300 text-sm">
            {event.teamA} {event.currentScore} {event.teamB}
          </div>
          <div className="text-slate-500 text-xs mt-1">{event.teamScored}</div>
          <div className="text-slate-600 text-xs mt-1">
            🕐 {event.kickoff}
          </div>

          {/* Expanded details */}
          {isExpanded && <ExpandedDetails event={event} />}
        </div>
      </div>

      {/* Timeline dot */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div
          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
            event.isClustered ? 'bg-orange-400 border-orange-400' : 'bg-cyan-400 border-cyan-400'
          } ${isExpanded ? 'scale-150 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : ''}`}
        />
      </div>

      {/* Spacer — empty side */}
      <div className="w-5/12" />
    </div>
  );
}

function DaySection({
  day,
  events,
  expandedId,
  onToggle,
}: {
  day: string;
  events: TimelineEvent[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-cyan-300 mb-6">
        Day {day}
        <span className="ml-2 text-sm font-normal text-slate-500">
          ({events.length} goal{events.length !== 1 ? 's' : ''})
        </span>
      </h2>
      <div className="relative">
        {/* Central glowing vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />

        {events.map((event, idx) => {
          const cardId = `${event.matchId}-${event.minute}-${idx}`;
          return (
            <TimelineCard
              key={cardId}
              event={event}
              idx={idx}
              isExpanded={expandedId === cardId}
              onToggle={() => onToggle(cardId)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StickyProgressBar({ days }: { days: string[] }) {
  const [progress, setProgress] = useState(0);
  const [currentDay, setCurrentDay] = useState(days[0] ?? '');

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setProgress(pct);

      const idx = Math.min(Math.floor((pct / 100) * days.length), days.length - 1);
      setCurrentDay(days[idx] ?? days[0]);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [days]);

  return (
    <div className="fixed top-0 left-0 z-30 w-full pointer-events-none">
      <div
        className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
      {progress > 0 && progress < 100 && (
        <div className="absolute top-2 right-4 text-xs text-cyan-400 font-mono bg-slate-900/80 px-2 py-1 rounded border border-cyan-400/30 shadow-lg">
          Day {currentDay} &middot; {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}

export default function GoalAvalanche() {
  const { year: yearParam } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const year = yearParam ?? '2018';
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);

  // Fetch available years on mount
  useEffect(() => {
    fetch('/api/years')
      .then((res) => res.json() as Promise<number[]>)
      .then((data) => {
        setYears(data);
      })
      .catch(() => {
        // Fallback to a sensible default if years endpoint fails
        setYears([2010, 2014, 2018, 2022]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setExpandedId(null);

    fetch(`/api/v1/goal-avalanche?year=${year}`)
      .then((res) => {
        if (!res.ok) throw new Error('Tournament not found');
        return res.json() as Promise<GoalAvalancheResponse>;
      })
      .then((data) => {
        setTimeline(data.timeline);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [year]);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-cyan-400 text-xl animate-pulse">Loading goal avalanche...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  const days = Object.keys(timeline).sort((a, b) => parseInt(a) - parseInt(b));

  // Empty state
  if (days.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400 text-xl">No goal data available for {year}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <StickyProgressBar days={days} />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Goal Avalanche</h1>
            <p className="text-slate-400">
              FIFA World Cup {year} &mdash; All goals in chronological order
            </p>
          </div>
          <select
            value={year}
            onChange={(e) => navigate(`/goal-avalanche/${e.target.value}`)}
            className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {days.map((day) => (
          <DaySection
            key={day}
            day={day}
            events={timeline[day]}
            expandedId={expandedId}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
