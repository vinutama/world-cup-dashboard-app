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
- [x] New handler `GetGoldenBoot(w, r)` at `GET /api/v1/predictions/golden-boot`
- [x] Fetch `https://gamma-api.polymarket.com/events?slug=world-cup-golden-boot-winner&closed=false`
- [x] Parse `markets` array; for each market:
  - Extract player name from question text (`"Will Lionel Messi be the top goalscorer..."`)
  - Extract Yes-probability from `outcomePrices[0]`
  - Normalize question parsing to handle varying question formats
- [x] Sort descending by probability, take top 10
- [x] Use existing `priceToPercent` helper for float→int conversion
- [x] In-memory cache with 60s TTL (same pattern as games cache)
- [x] Return JSON: `[{ "player": "Lionel Messi", "probability": 52 }, ...]`
- [x] Returns `[]` on error — no fallback or derivation

#### 14.2 Frontend: Golden Boot page
- [x] Create `src/pages/GoldenBoot.tsx`
- [x] Fetch `/api/v1/predictions/golden-boot` on mount
- [x] Top 10 player cards with:
  - Rank number (#1 gold, #2 silver, #3 bronze gradient — matching Pulse Wisdom Wheel style)
  - Player name
  - Percentage (large tabular-nums)
  - Neon progress bar (glassmorphic, same design language as Pulse)
- [x] Loading skeleton (10 shimmer rows)
- [x] Empty/error state
- [x] Register `/golden-boot` route in `App.tsx`

#### 14.3 Navigation & Testing
- [x] Add "Golden Boot" nav item to `Layout.tsx`
- [x] Add unit test `TestGetGoldenBoot` — verify handler returns valid JSON array with top 10
- [x] Create `e2e/golden-boot.spec.ts` — page loads, nav click works, data renders
- [x] `go test ./...` passes
- [x] `npx playwright test` passes
- [x] `docker compose build` + `curl` verification

---

## Phase 15: Continent World Cup Winner Predictions

### Overview
Add a new dashboard page showing which **continent** is predicted to win the 2026 World Cup, sourced from Polymarket's Gamma API. Each continent has a binary "Will {Continent} win?" market — the Yes price is the predicted probability.

**Gamma slug:** `which-continent-will-win-the-world-cup` (event ID: 98349, 7 markets)  
**Continents:** UEFA (Europe), CONMEBOL (South America), CONCACAF (North America), CAF (Africa), OCF (Oceania), AFC (Asia) + "another continent" (filtered out)

### Tasks

#### 15.1 Backend: Continent endpoint (`GET /api/v1/predictions/continent`)
- [x] New handler `GetContinentPredictions(w, r)` at `GET /api/v1/predictions/continent`
- [x] Fetch `https://gamma-api.polymarket.com/events?slug=which-continent-will-win-the-world-cup&closed=false`
- [x] Parse `markets` array; for each market:
  - Extract continent name from question text (`"Will North America (CONCACAF) win..."`)
  - Extract Yes-probability from `outcomePrices[0]`
  - Clean confederation codes to display names: UEFA→Europe, CONMEBOL→South America, CONCACAF→North America, CAF→Africa, OCF→Oceania, AFC→Asia
- [x] Sort descending by probability
- [x] Filter out "another continent" market (0% placeholder)
- [x] Use existing `priceToPercent` helper
- [x] In-memory cache with 60s TTL
- [x] Return JSON: `[{ "continent": "Europe", "label": "Europe (UEFA)", "probability": 61 }, ...]`
- [x] Returns `[]` on error — no fallback

#### 15.2 Frontend: Top Continent List component integrated into Pulse Oracle
- [x] Create `src/components/TopContinentList.tsx`
- [x] Fetch `/api/v1/predictions/continent` on mount
- [x] Continent cards with:
  - Continent emoji/icon (🌍 Europe, 🌎 Americas, 🌍 Africa, 🌏 Asia, 🌊 Oceania)
  - Continent name + confederation label
  - Percentage (large tabular-nums)
  - Neon progress bar (glassmorphic — same design as Wisdom Wheel list)
- [x] Loading skeleton + error state
- [x] **Import into `PulseDashboard.tsx`** — render inside the right column (`<div className="lg:col-span-5">`)
- [x] No standalone route or nav item — lives inside Pulse Oracle

#### 15.3 Testing
- [ ] Add unit test `TestGetContinentPredictions` — verify handler returns valid JSON array
- [ ] Update `e2e/pulse-oracle.spec.ts` — verify continent list renders in right column when data loads
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + verification

---

## Phase 16: Pulse Oracle UI Enhancement (Wheel + Polish)

### 16.1 Wisdom Wheel Component (`frontend/src/components/WisdomWheel.tsx`)
- [x] Create standalone `WisdomWheel.tsx` component in `src/components/`
- [x] Accept data prop (GlobalFavorite[] — from parent PulseDashboard)
- [x] Implement **circular wheel layout** with 10 segments arranged via CSS transform rotate/translate
- [x] Each segment shows: flag (`https://flagsapi.com/{CODE}/flat/48.png`) + team name + probability %
- [x] Team→country code mapping (same as Standings: France→fr, Brazil→br, etc.)
- [x] **Slow spin animation**: CSS `@keyframes spin-slow` with 45s full rotation
- [x] **Pause on hover**: `animation-play-state: paused`
- [x] Segments rotate into view — user can read each one as it passes
- [x] Loading skeleton: pulsing circle placeholder

### 16.2 Integrate Wheel into Pulse Oracle
- [x] Import `WisdomWheel` in `PulseDashboard.tsx`
- [x] Render `<WisdomWheel>` right below the "Pulse Oracle" title, before the grid
- [x] Keep the Wisdom Wheel inline list in the **left column** (`lg:col-span-7`) — unchanged from current layout
- [x] Wheel sits full-width, centered, responsive (handled by the component itself)

### 16.3 Remove Match Oracle Section
- [x] Delete the `MatchOracleList` function component entirely
- [x] Delete the `OracleListSkeleton` function (no longer needed)
- [x] Remove the Match Oracle fetch call from `useEffect`
- [x] Remove the `oracle` and `loadingOracle` state variables
- [x] Remove `UpcomingMatch` type import (no longer used)
- [x] Keep the **right column empty** as a placeholder (`lg:col-span-5`) — ready for continent list later

### 16.4 Full-Width Progress Bars in Wisdom Wheel Inline List
- [x] Change bar widths from proportional (`fav.probability%`) to full width (100%)
- [x] Keep neon gradient styling as decorative full bar
- [x] Show probability percentage as text inline next to team name

### 16.5 Testing
- [x] Verify Pulse Oracle loads with spinning wheel + half-width list + empty right column
- [x] Confirm Match Oracle section is completely gone (no card, no ghost)
- [x] `go test ./...` passes (no backend changes)
- [x] `npx playwright test` passes — 5 new E2E tests added for Pulse Oracle

---

## Phase 17: Live Scores on Match Cards

### Overview
Enhance the Games page at `/games` to display **live scores** from the gamma API event response itself. The event object includes `score`, `live`, `ended`, `period`, and `elapsed` fields for matches that have started/completed. Upcoming matches have none of these fields.

**Data model from gamma API:**
```json
// Completed: "score":"2-0","live":false,"ended":true,"period":"VFT","elapsed":""
// Live:     "score":"1-0","live":true,"ended":false,"period":"2H","elapsed":"67"
// Upcoming: no score/live/ended fields present
```

### Tasks

#### 17.1 Backend: Parse live scores from gamma API event
- [ ] Add score fields to `GameResponse`:
  - `Score string` — raw `"2-0"` from gamma, `""` if not started
  - `Score1 int` — home goals (parsed from Score)
  - `Score2 int` — away goals
  - `Live bool` — match in progress
  - `Ended bool` — match complete
  - `Period string` — `"1H"`, `"2H"`, `"VFT"`, etc.
  - `Elapsed string` — minutes elapsed
- [ ] Expand the gamma API event JSON struct in `fetchGammaGame` to decode these new fields
- [ ] Parse `score` → `Score1`/`Score2` ints (split on `-`)
- [ ] Upcoming: no `score` field → `Score=""`, `Live=false`, `Ended=false`
- [ ] Cache is already 60s TTL — scores freshen naturally

#### 17.2 Frontend: Display scores on match cards
- [ ] Add score fields to `GameItem`:
  - `score: string` / `score1: number` / `score2: number` / `live: boolean` / `ended: boolean`
- [ ] Update `MatchCard` in `src/pages/Games.tsx`:
  - [ ] Show score between team names: `{team1}  {score1} — {score2}  {team2}`
  - [ ] Not started (`score=""`): muted `0 — 0` in zinc-500
  - [ ] In progress (`live=true`): live score with subtle pulse animation
  - [ ] Ended (`ended=true`): final score, green glow on winner
- [ ] Style: neon `text-cyan-300` `font-mono tabular-nums`, larger digits
- [ ] **Auto-refetch every 5 min** — `setInterval(300000)` in a `useEffect`, calls `fetchGames()` silently, clears on unmount
- [ ] Keep existing odds display, badges, layout unchanged

#### 17.3 Testing
- [ ] Add Go unit test `TestGameScores` — verify score parsing from gamma API response
- [ ] Update `e2e/games.spec.ts` — verify score displayed (or placeholder) on match cards
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + verify on Docker

---

## Phase 18: Top Scorers Leaderboard

### Overview
Create a new `/top-scorers` page showing the **Top 10 Goalscorers** for World Cup 2026. Each entry shows rank, player name, nation flag (S3), and goals count.

**Data:**
- **Goalscorers** — Openfootball `worldcup.json` → `goals1`/`goals2` arrays per match
- **Flags** — Polymarket S3 `country-flags/{code}.png` via team→FIFA code mapping

### Tasks

#### 18.1 Backend: Aggregation endpoint
- [ ] Create `GetTopScorers` handler at `GET /api/v1/top-scorers`
- [ ] Fetch `worldcup.json`, filter WC tournament matches, aggregate `goals1`/`goals2` by player name
- [ ] Associate each player with their team (team1→goals1, team2→goals2)
- [ ] Map team name → FIFA code → flag URL (via `worldcup.squads.json` `fifa_code`)
- [ ] Sort desc by goals count, top 10
- [ ] Response: `TopScorer[]` (rank, name, team, teamCode, flagUrl, goals)
- [ ] Cache 60s TTL, empty array on error

#### 18.2 Frontend: Top Scorers page
- [ ] Create `TopScorers.tsx` in `frontend/src/pages/`
- [ ] Add route `/top-scorers` in `App.tsx`
- [ ] Add nav link **"Top Scorers"** in `Layout.tsx` (after Golden Boot)
- [ ] Single table: rank badge (gold/silver/bronze for 1-3), name, flag 24×18px, goals count
- [ ] Neon cyan numbers, dark glass-morphism cards
- [ ] Loading skeleton while fetching

#### 18.3 Testing
- [ ] Go unit test `TestTopScorers` — mock match data, verify aggregation + sorting
- [ ] Playwright E2E test — verify `/top-scorers` renders correctly
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + Docker verification

---

## Phase 19: Lineups — All Nations

### Overview
Create a `/lineups` page displaying the **full 26-player squad for all 48 World Cup 2026 nations**. Team cards with expandable roster showing number, position, name, club, age, and flag.

**Data:** Openfootball `worldcup.squads.json` — 48 teams × 26 players with `number`, `pos`, `name`, `club`, `date_of_birth`

### Tasks

#### 19.1 Backend: Proxy endpoint
- [ ] Create `GetLineups` handler at `GET /api/v1/lineups`
- [ ] Fetch `worldcup.squads.json` (48 teams, 26 players each)
- [ ] Map to response: team name, FIFA code, flag URL, group, players[]
- [ ] Each player: number, position, name, club, club country, DOB
- [ ] Cache 60s TTL, empty array on error

#### 19.2 Frontend: Lineups page
- [ ] Create `Lineups.tsx` in `frontend/src/pages/`
- [ ] Add route `/lineups` in `App.tsx`
- [ ] Add nav link **"Lineups"** in `Layout.tsx`
- [ ] Grid of 48 team cards (4-6 col responsive) with flag, team name, group label, player count
- [ ] Click to expand — show squad table with: #, position badge, name, club, age
- [ ] Position badges: GK=gold, DF=blue, MF=green, FW=red
- [ ] Glass-morphism cards, loading skeleton on mount

#### 19.3 Testing
- [ ] Go unit test `TestLineups` — verify all 48 teams + 26 players mapped correctly
- [ ] Playwright E2E test — verify `/lineups` renders team cards + expandable squads
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + Docker verification

---

## Phase 20: World Cup 2026 Bracket

### Overview
Create a `/bracket` page showing a **traditional tournament bracket tree** — Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Final + 3rd Place. Team flags, scores, and connector lines between rounds.

**Data:** Openfootball `worldcup.json` — 32 knockout matches across 6 rounds

### Tasks

#### 20.1 Backend: Bracket endpoint
- [ ] Create `GetBracket` handler at `GET /api/v1/bracket`
- [ ] Fetch `worldcup.json`, filter knockout rounds in order
- [ ] Map `W83`/`W84`/`L101` placeholder codes → `"TBD"`
- [ ] Response: `BracketMatch[]` with team name, code, flag URL, scores, completion flag
- [ ] Cache 60s TTL, empty array on error

#### 20.2 Frontend: Bracket tree page
- [ ] Create `Bracket.tsx` in `frontend/src/pages/`
- [ ] Add route `/bracket` in `App.tsx`
- [ ] Add nav link **"Bracket"** in `Layout.tsx`
- [ ] CSS Grid layout: 5 columns [Ro32] [Ro16] [QF] [SF] [Final+3rd]
- [ ] Connector lines (SVG or CSS) linking winners left→right between rounds
- [ ] Match cards: team 1 (flag + name + score) / team 2 (flag + name + score)
- [ ] States: played (green glow on winner) / live (pulse animation) / future (muted, dashed) / TBD (ghosted)
- [ ] Neon cyan scores, glass-morphism cards, blue-500 connector lines

#### 20.3 Testing
- [ ] Go unit test `TestBracket` — verify ordering + placeholder mapping
- [ ] Playwright E2E test — verify `/bracket` renders tree with all 32 matches
- [ ] `go test ./...` passes
- [ ] `npx playwright test` passes
- [ ] `docker compose build` + Docker verification
