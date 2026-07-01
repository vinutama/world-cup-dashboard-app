import { useRef, useEffect } from 'react';
import type { GlobalFavorite } from '../types/oracle';

// ─ Team → ISO 3166-1 alpha-3 Code ─────────────
const teamCodeMap: Record<string, string> = {
  Argentina: 'ARG', Australia: 'AUS', Austria: 'AUT', Belgium: 'BEL',
  'Bosnia and Herzegovina': 'BIH', Brazil: 'BRA', Canada: 'CAN',
  'Cabo Verde': 'CPV', Colombia: 'COL', "Côte d'Ivoire": 'CIV',
  Croatia: 'HRV', 'DR Congo': 'COD', Denmark: 'DNK', Ecuador: 'ECU',
  Egypt: 'EGY', England: 'ENG', France: 'FRA', Germany: 'DEU',
  Ghana: 'GHA', Japan: 'JPN', Mexico: 'MEX', Morocco: 'MAR',
  Netherlands: 'NLD', Nigeria: 'NGA', Norway: 'NOR', Paraguay: 'PRY',
  Poland: 'POL', Portugal: 'PRT', Senegal: 'SEN', Serbia: 'SRB',
  'South Africa': 'ZAF', Spain: 'ESP', Sweden: 'SWE', Switzerland: 'CHE',
  USA: 'USA', Wales: 'WAL', Uruguay: 'URY',
  'South Korea': 'KOR', 'Korea Republic': 'KOR', 'Saudi Arabia': 'SAU',
  Iran: 'IRN', Tunisia: 'TUN', Algeria: 'DZA',
  Turkey: 'TUR', Hungary: 'HUN', Cameroon: 'CMR', 'Costa Rica': 'CRI',
  Scotland: 'SCO', Ireland: 'IRL', Russia: 'RUS', Ukraine: 'UKR',
  Mali: 'MLI', Zambia: 'ZMB', 'Czech Republic': 'CZE', Greece: 'GRC',
  Romania: 'ROU', Slovakia: 'SVK', Slovenia: 'SVN', Iceland: 'ISL',
  Bulgaria: 'BGR',
};

function flagUrl(team: string): string {
  const code = teamCodeMap[team] || team.slice(0, 3).toUpperCase();
  return `https://polymarket-upload.s3.us-east-2.amazonaws.com/country-flags/${code.toLowerCase()}.png`;
}

// ─ Props ────────────────────────────────────────
interface WisdomWheelProps {
  data: GlobalFavorite[];
}

// ─ Skeleton ─────────────────────────────────────
export function WisdomWheelSkeleton() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-[300px] h-[300px] rounded-full bg-zinc-900/40 border border-zinc-800 animate-pulse" />
    </div>
  );
}

// ─ Segment ──────────────────────────────────────
const RADIUS = 130;

function Segment({
  team,
  probability,
  angle,
  counterRef,
}: {
  team: string;
  probability: number;
  angle: number;
  counterRef: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}px)`,
      }}
    >
      {/* Counter-rotated by the RAF loop so flag+% stays upright */}
      <div
        ref={counterRef}
        className="flex items-center gap-1 transition-all duration-300 hover:scale-110"
      >
        <img
          src={flagUrl(team)}
          alt={team}
          className="w-7 h-5 rounded-sm object-cover shrink-0 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
          loading="lazy"
        />
        <span className="text-[11px] font-bold text-cyan-300 tabular-nums drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]">
          {probability}%
        </span>
      </div>
    </div>
  );
}

// ─ Main Component ──────────────────────────────
export default function WisdomWheel({ data }: WisdomWheelProps) {
  if (!data || data.length === 0) return null;

  const items = data.slice(0, 10);
  const ANGLE_STEP = 360 / items.length;

  // ─ Refs for animation (no re-renders) ───────
  const wheelRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLDivElement | null)[]>([]);

  const angle = useRef(0);         // current wheel angle (deg)
  const velocity = useRef(0);      // angular velocity (deg per second)
  const drag = useRef(false);
  const autoMode = useRef(true);   // auto-spin vs inertia
  const prevAngle = useRef(0);     // pointer angle in last drag event
  const prevTime = useRef(0);      // timestamp of last drag event
  const lastFrame = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const SPEED = 360 / 45; // 1 revolution per 45 seconds

    const tick = (now: number) => {
      if (!lastFrame.current) lastFrame.current = now;
      const dt = Math.min((now - lastFrame.current) / 1000, 0.1);
      lastFrame.current = now;

      if (!drag.current) {
        if (autoMode.current) {
          // Auto-spin
          angle.current = (angle.current + SPEED * dt) % 360;
        } else {
          // Inertia decay
          if (Math.abs(velocity.current) > 5) {
            velocity.current *= 0.92; // friction
            angle.current = (angle.current + velocity.current * dt) % 360;
          } else {
            autoMode.current = true; // resume auto-spin
          }
        }
      }

      // Apply rotation to the ring
      if (ringRef.current) {
        ringRef.current.style.transform = `rotate(${angle.current}deg)`;
      }

      // Counter-rotate each segment so content stays upright
      counterRefs.current.forEach((el, i) => {
        if (el) {
          const segAngle = ANGLE_STEP * i;
          el.style.transform = `rotate(${-(angle.current + segAngle)}deg)`;
        }
      });

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
    // items count is stable for the lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Pointer helpers ──────────────────────────
  const pointerAngle = (clientX: number, clientY: number): number => {
    const el = wheelRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = true;
    autoMode.current = false;
    velocity.current = 0;
    prevAngle.current = pointerAngle(e.clientX, e.clientY);
    prevTime.current = performance.now();
    wheelRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const a = pointerAngle(e.clientX, e.clientY);
    let delta = a - prevAngle.current;
    // Handle 360° wrap
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;

    const now = performance.now();
    const dt = Math.max((now - prevTime.current) / 1000, 0.001);
    velocity.current = delta / dt; // deg/s
    prevTime.current = now;

    angle.current = (angle.current + delta) % 360;
    prevAngle.current = a;
  };

  const onPointerUp = () => {
    drag.current = false;
    // inertia kicks in from velocity.current
  };

  const setCounterRef = (i: number) => (el: HTMLDivElement | null) => {
    counterRefs.current[i] = el;
  };

  return (
    <div className="flex items-center justify-center py-8 overflow-hidden">
      <div
        ref={wheelRef}
        className="relative w-[320px] h-[320px] cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Rotating ring */}
        <div ref={ringRef} className="absolute inset-0">
          {/* Ring glow */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.06)]" />

          {items.map((item, i) => (
            <Segment
              key={item.team}
              team={item.team}
              probability={item.probability}
              angle={ANGLE_STEP * i}
              counterRef={setCounterRef(i)}
            />
          ))}
        </div>

        {/* Center hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_24px_rgba(6,182,212,0.35)] z-10 flex items-center justify-center">
          <span className="text-white font-black text-xs tracking-tight">
            ⚽
          </span>
        </div>
      </div>
    </div>
  );
}
