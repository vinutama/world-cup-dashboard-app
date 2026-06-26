import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { TimelineEvent, GoalAvalancheResponse } from '../types';

function TimelineCard({ event, idx }: { event: TimelineEvent; idx: number }) {
  const isRight = idx % 2 === 0;
  return (
    <div
      className={`relative flex items-start mb-6 ${
        isRight ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      {/* Card */}
      <div
        className={`w-5/12 ${isRight ? 'text-right pr-8' : 'text-left pl-8'}`}
      >
        <div
          className={`inline-block bg-white/5 backdrop-blur-md border rounded-xl p-4 shadow-xl text-left ${
            event.isClustered
              ? 'border-orange-400/60 shadow-[0_0_15px_rgba(251,146,60,0.3)]'
              : 'border-white/10'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-cyan-400">
              {event.minute}&prime;
            </span>
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
          <div className="text-slate-500 text-xs mt-1">
            {event.teamScored}
          </div>
        </div>
      </div>

      {/* Timeline dot */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            event.isClustered
              ? 'bg-orange-400 border-orange-400'
              : 'bg-cyan-400 border-cyan-400'
          }`}
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
}: {
  day: string;
  events: TimelineEvent[];
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

        {events.map((event, idx) => (
          <TimelineCard key={`${event.matchId}-${event.minute}-${idx}`} event={event} idx={idx} />
        ))}
      </div>
    </div>
  );
}

export default function GoalAvalanche() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = yearParam ?? '2018';
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-cyan-400 text-xl animate-pulse">
          Loading goal avalanche...
        </div>
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

  const days = Object.keys(timeline).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  // Empty state
  if (days.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400 text-xl">
          No goal data available for {year}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          Goal Avalanche
        </h1>
        <p className="text-slate-400 mb-8">
          FIFA World Cup {year} &mdash; All goals in chronological order
        </p>

        {days.map((day) => (
          <DaySection key={day} day={day} events={timeline[day]} />
        ))}
      </div>
    </div>
  );
}
