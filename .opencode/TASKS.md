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
- [x] Update the route `GET /api/v1/predictions/match/next`
- [x] HTTP GET to `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100`
- [x] Filter for events tagged "World Cup" or "Soccer"
- [x] Sort chronologically by `endDate`/`startDate` — find the single closest upcoming match

### 9.2 Backend: Data Parsing & Formatting
- [x] Extract `markets` array from the closest event (done in 9.1)
- [x] Unmarshal stringified JSON arrays (`outcomes`, `outcomePrices`) (done in 9.1)
- [x] Parse float prices into integer percentages (done in 9.1)
- [x] Return `{ fixtureName, percentHome, percentDraw, percentAway, source: "Polymarket" }` (done in 9.1)

### 9.3 Frontend: Binding the Next Match Oracle (React TSX)
- [x] Match Oracle panel reads from `/api/v1/predictions/match/next` only
- [x] Update 3-Way Probability Bar with new `percentHome/Draw/Away` values
- [x] Hero Header: replace API-Football "Advice" box with glowing `data.fixtureName`
- [x] Stat Labels: `HOME X%`, `DRAW Y%`, `AWAY Z%` below the bar

---

## Success Criteria

- [ ] `GET /api/v1/predictions/global` returns 200 with sorted odds
- [ ] `GET /api/v1/predictions/match/{id}` returns 200 (cached after first hit)
- [ ] Redis persists cache across container restarts
- [ ] PulseDashboard renders with live data
- [ ] Go 6/6 + Playwright 22/22 pass

## Phase 9.6: Fix Match Oracle — top 10 matches with dates + DNS resilience

### 9.6.1 Docker DNS Fix
- [x] Add `extra_hosts` for gamma-api.polymarket.com with fallback Cloudflare IPs
- [x] Custom Go dialer `gammaHTTPClient()` — tries system DNS first, falls back to hardcoded IP

### 9.6.2 Next Match Oracle → Top 10 with Dates
- [x] Rewrite `fetchUpcomingMatches()` — queries `/events?active=true&closed=false&q=World%20Cup&limit=50`
- [x] Filter market questions: must contain "vs" but NOT "winner"
- [x] Sort by endDate ascending, return top 10 with match name, date, outcomes, odds
- [x] Fallback: 10 hardcoded matches starting with "South Africa vs Canada — June 29"

### 9.6.3 Leaderboard — Live API Fix
- [x] Updated endpoint to `/markets?active=true&limit=50`
- [x] Added event field filter for "World Cup"
- [x] DNS-resilient client now serves live Polymarket data

## Phase 9.7: Fix match oracle fallback with correct WC 2026 fixtures + venues

### 9.7.1 Correct Match Fixtures
- [x] Replace fake fallback matches with real World Cup 2026 next 10 fixtures
- [x] Matches start from South Africa vs Canada (Jun 28, Los Angeles)
- [x] Each match has correct opponent names, dates, and venue locations
- [x] Team names use official format (dots, hyphens, "DR Congo", etc.)

### 9.7.2 Venue Support
- [x] Added `Venue` field to `UpcomingMatchResponse` Go struct
- [x] Updated frontend `UpcomingMatch` TS type with `venue` string
- [x] Display venue next to date in match oracle rows (dot separated)

### 9.7.3 Odds Adjusted to Realistic Values
- [x] Each match has sensible fan/win probabilities based on team strength

## Phase 9.8: Derive match odds from Polymarket WC Winner prices — 3-way with draw%

### 9.8.1 Remove All Fallback Data
- [x] Delete `fallbackUpcomingMatches()` — no hardcoded predictions
- [x] When gamma-api is unreachable, return `[]` instead of fallback

### 9.8.2 Live Polymarket Data → 3-Way Match Odds
- [x] `fetchWcWinnerProbabilities()` — queries gamma-api `/markets?active=true&limit=200` for ALL team probabilities
- [x] Team name mapping: `United States→USA`, `DR Congo→Congo DR`
- [x] For unrated teams: use residual 0.002 (0.2%) instead of 0
- [x] `derive3WayOdds()` converts two team WC probabilities → 3-way (home/draw/away) match odds
- [x] Draw probability model: 30% for equal teams, 10% for very unequal

### 9.8.3 Frontend: 3-Way Display
- [x] `UpcomingMatch` TS type: `percentHome / percentDraw / percentAway` (integers)
- [x] 3 pills per match row: Home %, Draw %, Away %
- [x] Source label per match row
- [x] Empty state: No upcoming match predictions available

## Phase 9.9: Leaderboard — no fallback, use markets endpoint with robust parsing

### 9.9.1 Remove fallbackLeaderboard()
- [x] Delete `fallbackLeaderboard()` — no hardcoded leaderboard
- [x] `GetGlobalLeaderboard` returns `[]` on error instead of fallback

### 9.9.2 Robust Polymarket API query
- [x] `fetchPolymarketTeams()` uses `/markets?active=true&limit=200` (catches all 32+ WC markets)
- [x] `json.RawMessage` + double-encoded string handling for `outcomePrices`
- [x] `bytes` + `errors` imports added

## Phase 10: Pure Gamma events query for match oracle + helper refactor

### 10.1 Replace derivation model with pure events query
- [x] Remove `scheduledFixture`, `wc2026Fixtures`, `teamNameToPolymarket`
- [x] Remove `deriveMatchOracle`, `derive3WayOdds`, `fetchWcWinnerProbabilities`
- [x] Add `fetchPureMatchOracle` — queries `/events?active=true&closed=false&limit=100`
- [x] Filters for "vs" + ("cup" or "match") events
- [x] Handles 3-way and binary Polymarket outcomes
- [x] Sorts chronologically by EndDate

### 10.2 Add reusable helpers
- [x] `parseRawJsonSlice` — safely handles double-encoded JSON arrays
- [x] `priceToPercent` — converts fractional price strings to int percentages

### 10.3 Leaderboard refactor
- [x] `fetchPolymarketTeams` uses `parseRawJsonSlice` + `priceToPercent`

