# Pulse (Oracle) Prediction Engine — Tasks

Generated from `.opencode/PLAN.md` — Phases 7 & 8.

---

## Phase 7: Backend Engine & Caching (Golang + Docker)

### 7.1 Docker Compose Infrastructure
- [x] Add Redis 7-alpine container to `docker-compose.yml`
  - [x] `redis_data` volume mapped to `/data`
  - [x] `container_name: worldcup_redis`
  - [x] `command: redis-server --appendonly yes`
  - [x] Skip host port (6379 in use; internal Docker network only)
- [x] Add `REDIS_ADDR=redis:6379` env var to the `backend` service
- [x] Add `depends_on: redis` to the backend service

### 7.2 Golang Redis Client Initialization
- [x] Run `go get github.com/redis/go-redis/v9`
- [x] Initialize Redis client in startup config using `os.Getenv("REDIS_ADDR")`
- [x] Implement `Ping()` health check on boot — fatal if Redis unreachable

### 7.3 Global Leaderboard Route (`GET /api/v1/predictions/global`)
- [x] Create handler proxying Polymarket gamma-api for 2026 WC winner markets
- [x] Extract team names from question text and parse "Yes" probabilities
- [x] Sort descending by probability, take top 10
- [x] Return JSON: `[{"team": "France", "probability": 23}, ...]`
- [x] Enable IPv6 in Docker network (gamma-api is IPv6-only) — `docker-compose.yml`

### 7.4 Match Oracle Route (`GET /api/v1/predictions/match/{fixture_id}`)
- [x] Implement Cache-Aside pattern:
  1. Check Redis key `match:oracle:{fixture_id}`
  2. Hit → return cached JSON immediately
  3. Miss → fetch live from API-Football `/predictions?fixture={fixture_id}`
  4. Store in Redis with `rdb.Set(ctx, key, payload, 6 * time.Hour)`
  5. Return JSON payload
- [x] Set `API_FOOTBALL_KEY` in `backend/.env`
- [x] Wire key through Docker Compose (`env_file: ./backend/.env`)

### 7.5 Backend Verification Gate (Hard Stop)
- [x] `docker compose up --build -d`
- [x] `curl http://localhost:8080/api/v1/predictions/global` → valid JSON array (fallback when Polymarket down)
- [x] Go 6/6 + Playwright 22/22 pass
- [x] **STOP** — report backend completion. No Phase 8 until verified.

---

## Phase 8: Frontend Presentation (React TSX + Tailwind CSS)

*Prerequisite: Phase 7 curl tests verified.*

### 8.1 TypeScript Contracts
- [x] Create `src/types/oracle.ts`
  - [x] `GlobalFavorite { team: string; probability: number }`
  - [x] `MatchOracle { fixtureId: string; winnerAdvice: string; percentHome: number; percentDraw: number; percentAway: number }`

### 8.2 Canvas & Layout Architecture
- [x] Create `src/components/PulseDashboard.tsx`
  - [x] Deep space base: `min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans`
  - [x] Responsive 12-col grid: `grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto`
  - [x] Ambient cyberpunk orb: `fixed top-1/3 left-1/2` with cyan blur

### 8.3 Left Viewport: The Wisdom Wheel (`lg:col-span-7`)
- [x] Fetch data from `/api/v1/predictions/global`
- [x] Glassmorphic team rows with hover effects
- [x] Neon glow progress bar (gradient from cyan→blue→indigo)
- [x] Gold/silver/bronze gradient text for ranks #1–#3

### 8.4 Right Viewport: The Match Oracle (`lg:col-span-5`)
- [x] Fetch data from `/api/v1/predictions/match/{next_fixture_id}`
- [x] Glassmorphic main card with Cyber Scanner accent line
- [x] Glowing callout box for recommendation advice
- [x] 3-Way Probability Bar (emerald / amber / rose)

### 8.5 Polish & Loading States
- [x] Glassmorphic skeleton placeholders for `isLoading` state
- [x] `animate-fade-in` entry transition on master wrapper

---

## Phase 9: The Next Match Oracle (Polymarket Gamma Integration)

### 9.1 Backend: The Gamma API Fetcher (Go)
- [ ] Update the route `GET /api/v1/predictions/match/next`
- [ ] HTTP GET to `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100`
- [ ] Filter for events tagged "World Cup" or "Soccer"
- [ ] Sort chronologically by `endDate`/`startDate` — find the single closest upcoming match

### 9.2 Backend: Data Parsing & Formatting
- [ ] Extract `markets` array from the closest event
- [ ] Unmarshal stringified JSON arrays (`outcomes`, `outcomePrices`)
- [ ] Parse float prices into integer percentages
- [ ] Return `{ fixtureName, percentHome, percentDraw, percentAway, source: "Polymarket" }`

### 9.3 Frontend: Binding the Next Match Oracle (React TSX)
- [ ] Match Oracle panel reads from `/api/v1/predictions/match/next` only
- [ ] Update 3-Way Probability Bar with new `percentHome/Draw/Away` values
- [ ] Hero Header: replace API-Football "Advice" box with glowing `data.fixtureName`
- [ ] Stat Labels: `HOME X%`, `DRAW Y%`, `AWAY Z%` below the bar

---

## Success Criteria

- [ ] `GET /api/v1/predictions/global` returns 200 with sorted odds
- [ ] `GET /api/v1/predictions/match/{id}` returns 200 (cached after first hit)
- [ ] Redis persists cache across container restarts
- [ ] PulseDashboard renders with live data
- [ ] Go 6/6 + Playwright 22/22 pass
