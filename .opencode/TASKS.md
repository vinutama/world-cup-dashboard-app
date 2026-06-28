# Pulse (Oracle) Prediction Engine — Tasks

Generated from `.opencode/PLAN.md` — Phases 7 & 8.

---

## Phase 7: Backend Engine & Caching (Golang + Docker)

### 7.1 Docker Compose Infrastructure
- [x] Add Redis 7-alpine container to `docker-compose.yml`
  - [x] `redis_data` volume mapped to `/data`
  - [x] `container_name: worldcup_redis`
  - [x] `command: redis-server --appendonly yes`
- [x] Declare `redis_data` volume at bottom of compose file
- [x] Add `REDIS_ADDR=redis:6379` env var to the `backend` service

### 7.2 Golang Redis Client Initialization
- [x] Run `go get github.com/redis/go-redis/v9`
- [x] Initialize Redis client in startup config using `os.Getenv("REDIS_ADDR")`
- [x] Implement `Ping()` health check on boot — fatal if Redis unreachable

### 7.3 Global Leaderboard Route (`GET /api/v1/predictions/global`)
- [ ] Create handler proxying `https://gamma-api.polymarket.com/markets?slug=winner-of-2026-fifa-world-cup`
- [ ] Parse `outcomes` (teams) and `outcomePrices` (odds) from Polymarket response
- [ ] Sort descending by price, take top 10
- [ ] Convert float strings (e.g. `"0.184"`) → integer percentages (e.g. `18`)
- [ ] Return JSON: `[{"team": "France", "probability": 18}, ...]`

### 7.4 Match Oracle Route (`GET /api/v1/predictions/match/{fixture_id}`)
- [ ] Implement Cache-Aside pattern:
  1. Check Redis key `match:oracle:{fixture_id}`
  2. Hit → return cached JSON immediately
  3. Miss → fetch live from API-Football `/predictions?fixture={fixture_id}`
  4. Store in Redis with `rdb.Set(ctx, key, payload, 6 * time.Hour)`
  5. Return JSON payload

### 7.5 Backend Verification Gate (Hard Stop)
- [ ] `docker compose up --build -d`
- [ ] `curl http://localhost:8080/api/v1/predictions/global` → valid JSON array
- [ ] **STOP** — report backend completion. No Phase 8 until verified.

---

## Phase 8: Frontend Presentation (React TSX + Tailwind CSS)

*Prerequisite: Phase 7 curl tests verified.*

### 8.1 TypeScript Contracts
- [ ] Create `src/types/oracle.ts`
  - [ ] `GlobalFavorite { team: string; probability: number }`
  - [ ] `MatchOracle { fixtureId: string; winnerAdvice: string; percentHome: number; percentDraw: number; percentAway: number }`

### 8.2 Canvas & Layout Architecture
- [ ] Create `src/components/PulseDashboard.tsx`
  - [ ] Deep space base: `min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans`
  - [ ] Responsive 12-col grid: `grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto`
  - [ ] Ambient cyberpunk orb: `fixed top-1/3 left-1/2` with cyan blur

### 8.3 Left Viewport: The Wisdom Wheel (`lg:col-span-7`)
- [ ] Fetch data from `/api/v1/predictions/global`
- [ ] Glassmorphic team rows with hover effects
- [ ] Neon glow progress bar (gradient from cyan→blue→indigo)
- [ ] Gold/silver/bronze gradient text for ranks #1–#3

### 8.4 Right Viewport: The Match Oracle (`lg:col-span-5`)
- [ ] Fetch data from `/api/v1/predictions/match/{next_fixture_id}`
- [ ] Glassmorphic main card with Cyber Scanner accent line
- [ ] Glowing callout box for recommendation advice
- [ ] 3-Way Probability Bar (emerald / amber / rose)

### 8.5 Polish & Loading States
- [ ] Glassmorphic skeleton placeholders for `isLoading` state
- [ ] `animate-fade-in` entry transition on master wrapper

---

## Success Criteria

- [ ] `GET /api/v1/predictions/global` returns 200 with sorted odds
- [ ] `GET /api/v1/predictions/match/{id}` returns 200 (cached after first hit)
- [ ] Redis persists cache across container restarts
- [ ] PulseDashboard renders with live data
- [ ] Go 6/6 + Playwright 22/22 pass
