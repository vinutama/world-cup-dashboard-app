# Pulse (Oracle) Prediction Engine — Tasks

Generated from `.opencode/PLAN.md` — Phases 7 & 8.

---

## Phase 7: Backend Engine & Caching (Golang + Docker)

- [x] Add Redis 7-alpine container to `docker-compose.yml`
- [x] Add `REDIS_ADDR=redis:6379` env var to the `backend` service
- [x] Add `depends_on: redis` to the backend service
- [x] Run `go get github.com/redis/go-redis/v9`
- [x] Initialize Redis client in startup config
- [x] Implement `Ping()` health check on boot
- [x] Create handler proxying Polymarket gamma-api for 2026 WC winner markets
- [x] Extract team names from question text and parse "Yes" probabilities
- [x] Sort descending by probability, take top 10
- [x] Return JSON: `[{"team": "France", "probability": 23}, ...]`
- [x] Enable IPv6 in Docker network (gamma-api is IPv6-only)
- [x] Implement Cache-Aside pattern for match oracle
- [x] Set `API_FOOTBALL_KEY` in `backend/.env`
- [x] Wire key through Docker Compose

## Phase 8: Frontend Presentation (React TSX + Tailwind CSS)

- [x] Create `src/types/oracle.ts`
- [x] Create `src/components/PulseDashboard.tsx`
- [x] Deep space base + responsive grid
- [x] Wisdom Wheel (Global Leaderboard) component
- [x] Match Oracle List component
- [x] Glassmorphic styling, loading skeletons

## Phase 9: The Next Match Oracle (Polymarket Gamma Integration)

- [x] Update route `GET /api/v1/predictions/match/next`
- [x] Query gamma-api events, filter for match events
- [x] Parse stringified JSON arrays (outcomes, outcomePrices)
- [x] Parse float prices into integer percentages
- [x] Frontend: bind Match Oracle panel to new endpoint
- [x] Remove all fallback data

## Phase 10: Pure Gamma events query + helper refactor

- [x] Remove derivation model, replace with pure events query
- [x] Add `parseRawJsonSlice` and `priceToPercent` helpers
- [x] Refactor leaderboard to use helpers

## Phase 11: Unified Polymarket data source

- [x] Both endpoints share `fetchPolymarketTeams`
- [x] Match oracle derives 3-way odds from WC Winner probs
- [x] Random draw percentage via math/rand
- [x] No fallback data

## Phase 12: Pure events-only match oracle

- [x] Remove all derivation code (math/rand, fixtures, mapping)
- [x] Restore `fetchPureMatchOracle` querying `/events`
- [x] Returns `[]` when no events found

---

## Phase 13: Games Section — Polymarket Match Slugs + Live Odds

### Overview
Add a `GET /api/v1/games` backend endpoint that queries Polymarket's Gamma API for all 16 World Cup 2026 match slugs and their live moneyline odds. Add a frontend Games page to display the matches with real-time Polymarket odds.

### Tasks

**Review Notes (from REVIEWER.md):**
- ⚠️ Add in-memory cache (sync.Map / simple TTL) to avoid 16+ Gamma API calls per request
- ⚠️ Handle both single-object and array response from `events/slug/{slug}`
- ⚠️ Select only binary moneyline markets (outcomes.length == 2) for odds extraction
- ⚠️ Parse team names from slug for clean display (e.g. `fifwc-rsa-can-2026-06-28`)
- ⚠️ Verify `next_cursor` pagination edge cases

#### 13.1 Backend: fetchGammaMatchSlugs — query events/keyset for game slugs
- [x] New function `fetchGammaMatchSlugs(ctx) ([]GameSlug, error)` in `handler.go`
- [x] Calls `https://gamma-api.polymarket.com/events/keyset?closed=false&limit=100&series_id=11433`
- [x] Handles pagination via `next_cursor` to get all slugs (Colombia vs Ghana on page 2)
- [x] Filters events with no `parentEventId` to get main match slugs only
- [x] Parses team names from slug pattern `fifwc-{teamA}-{teamB}-{date}`
- [x] Returns `[]` (empty) on error — no fallback

#### 13.2 Backend: fetchGammaMatchOdds — query events/slug/{slug} for moneyline
- [x] New function `fetchGammaMatchOdds(ctx, slug) (*GameOdds, error)` in `handler.go`
- [x] Calls `https://gamma-api.polymarket.com/events/slug/{slug}`
- [x] Handles single-object response (not array)
- [x] Selects only binary moneyline markets (outcomes.length == 2)
- [x] Parses match team names, date, and binary market prices (2 outcomes)
- [x] Returns home/away probabilities as percentages + volumes
- [x] Handles `outcomePrices` double-encoded strings via `parseRawJsonSlice`

#### 13.3 Backend: HandleGamesList handler + in-memory cache
- [x] New handler `GetGamesList(w, r)` exposed at `GET /api/v1/games`
- [x] Orchestrates: fetch slugs → for each slug fetch odds → combine into response array
- [x] Add `sync.Map` in-memory cache with 30s TTL for aggregated response (avoids 16 calls per request)
- [x] Uses `parseRawJsonSlice` + `priceToPercent` helpers (existing)
- [x] Uses `gammaHTTPClient()` for DNS-resilient connections (existing)
- [x] GameResponse JSON: `{ slug, team1, team2, date, percentHome, percentAway, volume, source }`

#### 13.4 Backend: Register route + Go test
- [x] Register `GET /api/v1/games` route in `RegisterRoutes`
- [x] Add unit test `TestGetGamesList` — verify handler returns valid JSON array
- [x] Full test suite: `go test ./...` (must pass)

#### 13.5 Frontend: TypeScript types + Games page component
- [x] Add `GameItem` interface to `src/types/oracle.ts`
- [x] Create `src/pages/Games.tsx` — fetches `/api/v1/games`, renders match cards with odds
- [x] Glassmorphic styling matching PulseDashboard design language
- [x] Loading skeleton + empty state
- [x] Register route `/games` in `App.tsx`
- [x] Add "Games" nav item to `Layout.tsx`

#### 13.6 Frontend: Playwright e2e test
- [x] Add Games smoke test to `e2e/smoke.spec.ts` or create `e2e/games.spec.ts`
- [x] Verify page loads and renders matches
- [x] Full suite: `npx playwright test` (must pass)

#### 13.7 Docker build + integration verification
- [x] `docker compose build backend && docker compose up -d backend`
- [x] `docker compose build frontend && docker compose up -d frontend`
- [x] `curl http://localhost:8080/api/v1/games` → valid JSON array
- [x] Playwright test against Docker stack passes

---

## Success Criteria

- [x] `GET /api/v1/games` returns 200 with 16 match items (or all available)
- [x] Each match has: slug, team1, team2, date, percentHome, percentAway, volume
- [x] Games frontend page renders with live odds
- [x] Go tests 43+/43+ pass
- [x] Playwright tests 9+/9+ pass
- [x] All Docker containers build and serve correctly

---

## Phase 13.8: Stats & Standings — Group Tables with Live Results

### Overview
Add a `GET /api/v1/standings` backend endpoint that fetches World Cup 2026 match results from the openfootball GitHub repo and computes live group standings. Add a frontend Standings page rendering all 12 group tables with team stats (P, W, D, L, GF, GA, GD, PTS).

### Tasks

#### 13.8.1 Backend: Standings endpoint + ESPN API integration
- [x] New handler `GetStandings(w, r)` at `GET /api/v1/standings`
- [x] Fetch `https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json`
- [x] Compute W/D/L/GF/GA/GD/PTS from actual match scores via openfootball data
- [x] Sort by points, then goal diff, then goals for
- [x] In-memory cache with 60s TTL
- [x] Return JSON array: `[{ group, teams: [{ teamName, played, wins, draws, losses, goalsFor, goalsAgainst, goalDiff, points }] }]`

#### 13.8.2 Backend: Route + test
- [x] Register `GET /api/v1/standings` route in `RegisterRoutes`
- [x] Add unit test `TestGetStandings_ReturnsValidJSON`
- [x] `go test ./...` passes (45/45)

#### 13.8.3 Frontend: Standings page component
- [x] Create `src/pages/Standings.tsx` — fetches `/api/v1/standings`, renders group tables
- [x] Group grid layout (2 columns on desktop, 1 on mobile)
- [x] Table columns: #, Team (with flag), P, W, D, L, GF, GA, GD, PTS
- [x] Top 2 teams highlighted with emerald accent (qualification spots)
- [x] Loading skeleton + error state
- [x] Flags from flagsapi.com
- [x] Register `/standings` route in `App.tsx`
- [x] Add "Standings" nav item in `Layout.tsx`

#### 13.8.4 Frontend: Playwright e2e test
- [x] Create `e2e/standings.spec.ts` — page load + nav click
- [x] Handles both success (data renders) and error (ESPN unreachable in CI) states
- [x] `npx playwright test` passes (26/26)

#### 13.8.5 Docker build + integration
- [x] `docker compose build frontend && docker compose up -d frontend`
- [x] Playwright tests against Docker stack pass

---

## Success Criteria

- [x] `GET /api/v1/standings` returns 200 with 12 group standings
- [x] Each team has: teamName, played, wins, draws, losses, goalsFor, goalsAgainst, goalDiff, points
- [x] Standings frontend page renders with group tables and flags
- [x] Go tests 45/45 pass
- [x] Playwright tests 26/26 pass
- [x] All Docker containers build and serve correctly

---

## Phase 14: Golden Boot Winner Predictions

### Overview
Add a new dashboard page showing the **top 10 players** most predicted to win the Golden Boot (top goalscorer) at the 2026 World Cup, sourced from Polymarket's Gamma API. Each player has a binary "Will {Player} be the top goalscorer?" market — the Yes price is the predicted probability.

**Gamma slug:** `world-cup-golden-boot-winner` (event ID: 413862, 80 markets)

### Tasks

#### 14.1 Backend: Golden Boot endpoint (`GET /api/v1/predictions/golden-boot`)
- [ ] New handler `GetGoldenBoot(w, r)` at `GET /api/v1/predictions/golden-boot`
- [ ] Fetch `https://gamma-api.polymarket.com/events?slug=world-cup-golden-boot-winner&closed=false`
- [ ] Parse `markets` array; for each market:
  - Extract player name from question text (`"Will Lionel Messi be the top goalscorer..."`)
  - Extract Yes-probability from `outcomePrices[0]`
  - Normalize question parsing to handle varying question formats
- [ ] Sort descending by probability, take top 10
- [ ] Use existing `priceToPercent` helper for float→int conversion
- [ ] In-memory cache with 60s TTL (same pattern as games cache)
- [ ] Return JSON: `[{ "player": "Lionel Messi", "probability": 52 }, ...]`
- [ ] Returns `[]` on error — no fallback or derivation

#### 14.2 Frontend: Golden Boot page
- [ ] Create `src/pages/GoldenBoot.tsx`
- [ ] Fetch `/api/v1/predictions/golden-boot` on mount
- [ ] Top 10 player cards with:
  - Rank number (#1 gold, #2 silver, #3 bronze gradient — matching Pulse Wisdom Wheel style)
  - Player name
  - Percentage (large tabular-nums)
  - Neon progress bar (glassmorphic, same design language as Pulse)
- [ ] Loading skeleton (10 shimmer rows)
- [ ] Empty/error state
- [ ] Register `/golden-boot` route in `App.tsx`

#### 14.3 Navigation & Testing
- [ ] Add "Golden Boot" nav item to `Layout.tsx`
- [ ] Add unit test `TestGetGoldenBoot` — verify handler returns valid JSON array with top 10
- [ ] Create `e2e/golden-boot.spec.ts` — page loads, nav click works, data renders
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + `curl` verification

---

## Phase 15: Continent World Cup Winner Predictions

### Overview
Add a new dashboard page showing which **continent** is predicted to win the 2026 World Cup, sourced from Polymarket's Gamma API. Each continent has a binary "Will {Continent} win?" market — the Yes price is the predicted probability.

**Gamma slug:** `which-continent-will-win-the-world-cup` (event ID: 98349, 7 markets)  
**Continents:** UEFA (Europe), CONMEBOL (South America), CONCACAF (North America), CAF (Africa), OCF (Oceania), AFC (Asia) + "another continent" (filtered out)

### Tasks

#### 15.1 Backend: Continent endpoint (`GET /api/v1/predictions/continent`)
- [ ] New handler `GetContinentPredictions(w, r)` at `GET /api/v1/predictions/continent`
- [ ] Fetch `https://gamma-api.polymarket.com/events?slug=which-continent-will-win-the-world-cup&closed=false`
- [ ] Parse `markets` array; for each market:
  - Extract continent name from question text (`"Will North America (CONCACAF) win..."`)
  - Extract Yes-probability from `outcomePrices[0]`
  - Clean confederation codes to display names: UEFA→Europe, CONMEBOL→South America, CONCACAF→North America, CAF→Africa, OCF→Oceania, AFC→Asia
- [ ] Sort descending by probability
- [ ] Filter out "another continent" market (0% placeholder)
- [ ] Use existing `priceToPercent` helper
- [ ] In-memory cache with 60s TTL
- [ ] Return JSON: `[{ "continent": "Europe", "label": "Europe (UEFA)", "probability": 61 }, ...]`
- [ ] Returns `[]` on error — no fallback

#### 15.2 Frontend: Continent page
- [ ] Create `src/pages/Continent.tsx`
- [ ] Fetch `/api/v1/predictions/continent` on mount
- [ ] Continent cards with:
  - Emoji flag/icon (🌍 Europe, 🌎 Americas, 🌍 Africa, 🌏 Asia, 🌊 Oceania)
  - Continent name + confederation label
  - Percentage (large tabular-nums)
  - Neon progress bar (glassmorphic style)
- [ ] Loading skeleton + empty/error state
- [ ] Register `/continent` route in `App.tsx`

#### 15.3 Navigation & Testing
- [ ] Add "Continent" nav item to `Layout.tsx`
- [ ] Add unit test `TestGetContinentPredictions` — verify handler returns valid JSON array
- [ ] Create `e2e/continent.spec.ts` — page loads, nav click works, data renders
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + verification
