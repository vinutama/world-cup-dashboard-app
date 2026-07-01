# World Cup Dashboard MVP

## Goal

Build a local-only MVP dashboard that allows users to:

- View World Cup tournaments
- Filter by year
- Browse matches
- View match details
- Explore a cinematic "Goal Avalanche" timeline of every goal scored

Data source:

https://github.com/openfootball/worldcup.json

Deployment target:

- Local machine only
- Docker Compose only
- No cloud deployment

---

# Engineering Goal

This repository is also used to validate autonomous software development workflows.

The agent must:

- Plan
- Implement
- Test
- Review
- Detect issues
- Create GitHub issues
- Fix issues
- Update documentation

without human intervention whenever possible.

---

# Development Workflow

For every task:

1. Analyze
2. Implement
3. Run tests
4. Run lint
5. Self review
6. Create GitHub Issue if defect found
7. Fix defect
8. Commit

---

# Feature Extensions (Post-MVP)

After MVP completion, the following extensions are planned:

- **Phase 6 — Goal Avalanche Timeline:** A new Go backend endpoint (`/api/v1/goal-avalanche`) that parses worldcup.json to extract every goal into a structured timeline. A React + Tailwind frontend renders a cinematic dark-mode vertical timeline with:
  - Chronological goal cards grouped by match day
  - Expandable detail views (match result, stage, minute track)
  - "Chaos Zone" detection for multiple goals scored simultaneously
  - Intersection Observer scroll animations
  - Sticky progress bar tracking scroll depth

---
---
# Success Criteria

Functional:

- User can browse all World Cups
- User can filter by year
- User can view match details
- User can explore the Goal Avalanche timeline for any tournament

Engineering:

- CI passes
- Tests pass
- Agent can create GitHub Issues
- Agent can review its own work

---

# Pulse (Oracle) Prediction Engine — Phases 7 & 8

## 🎯 Module Overview
Build the Pulse (or **Oracle**) prediction engine. To maintain strict engineering discipline, this module is bifurcated into two strictly isolated phases:

* PHASE 7: Pure Backend Infrastructure (Docker, Golang, Redis, API Ingestion, Caching).
* PHASE 8: Pure Frontend Presentation (React TSX, Tailwind CSS, Cyberpunk Glassmorphism, Animations).

CRITICAL HERMES RULE: Do not write a single line of React code for Phase 8 until all Phase 7 Golang endpoints return verified 200 OK JSON payloads via terminal curl tests.

---

# PHASE 7: BACKEND ENGINE & CACHING (Golang + Docker)

### 7.1 Docker Compose Infrastructure
* [ ] Open docker-compose.yml.
* [ ] Add the persistent Redis container:
   redis:
    image: redis:7-alpine
    container_name: worldcup_redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  * [ ] Map the redis_data volume at the bottom of the compose file.
* [ ] Inject REDIS_ADDR=redis:6379 into the Golang backend service environment.

### 7.2 Golang Redis Client Initialization
* [ ] Run go get github.com/redis/go-redis/v9.
* [ ] In Go's startup config, initialize the Redis client using os.Getenv("REDIS_ADDR").
* [ ] Implement a Ping() check on boot; if Redis fails to respond, log a fatal error.

### 7.3 Global Leaderboard Route (`GET /api/v1/predictions/global`)
* [ ] Create handler proxying Polymarket: https://gamma-api.polymarket.com/markets?slug=winner-of-2026-fifa-world-cup
* [ ] Parse outcomes (Teams) and outcomePrices (Odds).
* [ ] Sort descending by price. Take the top 10.
* [ ] Transform float string prices (e.g., `"0.184"`) into clean integer percentages (`18`).
* [ ] Return JSON: [{"team": "France", "probability": 18}, ...]

### 7.4 Match Oracle Route (`GET /api/v1/predictions/match/{fixture_id}`)
* [ ] Implement the Cache-Aside pattern:
    1. Check Redis key match:oracle:{fixture_id}.
    2. Hit: Return cached raw JSON immediately.
    3. Miss: Fetch live data from API-Football /predictions?fixture={fixture_id}.
    4. Store response in Redis: rdb.Set(ctx, key, payload, 6 * time.Hour).
    5. Return JSON payload to client.

### 7.5 Backend Verification Gate (Hard Stop)
* [ ] Spin up Docker Compose (`docker compose up --build -d`).
* [ ] Execute curl http://localhost:8080/api/v1/predictions/global and verify a valid JSON array.
* [ ] STOP AGENT EXECUTION HERE. Report backend completion to the user. Do not proceed to Phase 8 automatically.

---

# PHASE 8: THE FANCY FRONTEND (React TSX + Tailwind CSS)

*Prerequisite: Phase 7 terminal curl tests must be verified.*

### 8.1 TypeScript Contracts (`src/types/oracle.ts`)
* [ ] Define exact types matching the Go backend's JSON output:
   export interface GlobalFavorite {
    team: string;
    probability: number;
  }

  export interface MatchOracle {
    fixtureId: string;
    winnerAdvice: string;
    percentHome: number;
    percentDraw: number;
    percentAway: number;
  }
  
### 8.2 Canvas & Layout Architecture
* [ ] Create src/components/PulseDashboard.tsx.
* [ ] Apply baseline deep space styling: min-h-screen bg-[#09090b] text-zinc-100 p-6 font-sans.
* [ ] Create the responsive 12-column grid: grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto.
* [ ] Inject the ambient cyberpunk lighting orb:
   <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
  
### 8.3 Left Viewport: The Wisdom Wheel (Lg:col-span-7)
* [ ] Fetch data from /api/v1/predictions/global.
* [ ] Render glassmorphic rows: 
  bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-4 mb-3 flex items-center justify-between hover:border-cyan-500/50 hover:bg-zinc-800/40 transition-all duration-300
* [ ] Build the Neon Glow Progress Bar:
  * Outer track: w-48 h-2 bg-zinc-800/80 rounded-full overflow-hidden p-[1px]
* Inner fill: h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all duration-1000 ease-out *(Bind width via inline style)*.
* [ ] Give ranks #1, #2, and #3 a metallic gold/silver/bronze text gradient: bg-gradient-to-br from-amber-300 to-yellow-600 bg-clip-text text-transparent font-black.

### 8.4 Right Viewport: The Match Oracle (Lg:col-span-5)
* [ ] Fetch data from /api/v1/predictions/match/{next_fixture_id}.
* [ ] Render main card: bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl.
* [ ] Add a top Cyber Scanner accent line: 
   <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
  * [ ] Display the recommendation advice in a glowing callout hero box: 
  border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-lg p-4 rounded-xl text-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]
* [ ] Build the 3-Way Probability Bar:
   <div className="flex h-4 w-full rounded-full overflow-hidden gap-[2px] bg-zinc-950 p-[2px] border border-zinc-800">
    <div style={{ width: `${data.percentHome}%` }} className="bg-emerald-500 h-full rounded-l-full shadow-[0_0_8px_#10b981]" />
    <div style={{ width: `${data.percentDraw}%` }} className="bg-amber-500 h-full shadow-[0_0_8px_#f59e0b]" />
    <div style={{ width: `${data.percentAway}%` }} className="bg-rose-500 h-full rounded-r-full shadow-[0_0_8px_#f43f5e]" />
  </div>
  
### 8.5 Polish & Loading States
* [ ] Create matching glassmorphic React Skeleton placeholder blocks for the initial isLoading state so the page doesn't jump.
* [ ] Add a subtle entry transition to the master wrapper (`animate-fade-in`).

---

# PHASE 9: THE NEXT MATCH ORACLE (Polymarket Gamma Integration)

## 🎯 Objective
Replace all third-party sports APIs and upgrade the dashboard to *exclusively* show the single next upcoming 2026 World Cup match prediction. Uses the 100% free, public Polymarket Gamma API to source global crowd-sentiment probabilities for the next game.

---

### 9.1 Backend: The Gamma API Fetcher (Go)
* [ ] Update the route `GET /api/v1/predictions/match/next`.
* [ ] Make a standard HTTP GET request to Polymarket's public metadata discovery endpoint:
  `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100`
  *(No API keys or auth required for this read-only Gamma endpoint).*
* [ ] Filter & Sort (The Next Match Logic):
  1. Iterate through the JSON response and filter for events where the tags/category include "World Cup" or "Soccer".
  2. Parse the `endDate` or `startDate` of these filtered events.
  3. Sort the events chronologically to find the single closest upcoming match in time.

### 9.2 Backend: Data Parsing & Formatting
* [ ] Extract the `markets` array from that single closest event.
* [ ] Locate the `outcomes` array and the corresponding `outcomePrices` array.
  *Note: Polymarket returns these as stringified JSON arrays (e.g., `"[\"USA\", \"Draw\", \"Wales\"]"`). Unmarshal them properly in Go.*
* [ ] Parse float string prices (e.g., `"0.30"`) into clean integer percentages (`30, 20, 50`).
* [ ] Return the following JSON payload:
  ```json
  {
    "fixtureName": "USA vs Wales",
    "percentHome": 30,
    "percentDraw": 20,
    "percentAway": 50,
    "source": "Polymarket"
  }
  ```

### 9.3 Frontend: Binding the Next Match Oracle (React TSX)
* [ ] In `src/components/PulseDashboard.tsx`, ensure the Match Oracle panel only consumes data from `/api/v1/predictions/match/next`.
* [ ] Update the 3-Way Probability Bar: Bind inline width styles to the new `percentHome`, `percentDraw`, `percentAway` values.
  ```tsx
  <div className="flex h-4 w-full rounded-full overflow-hidden gap-[2px] bg-zinc-950 p-[2px] border border-zinc-800">
    <div style={{ width: `${data.percentHome}%` }} className="bg-emerald-500 h-full rounded-l-full shadow-[0_0_8px_#10b981]" />
    <div style={{ width: `${data.percentDraw}%` }} className="bg-amber-500 h-full shadow-[0_0_8px_#f59e0b]" />
    <div style={{ width: `${data.percentAway}%` }} className="bg-rose-500 h-full rounded-r-full shadow-[0_0_8px_#f43f5e]" />
  </div>
  ```
* [ ] Hero Header: Remove any leftover API-Football components (old "Advice" text box). Replace with a glowing neon header displaying `data.fixtureName`.
|----

# PHASE 14: GOLDEN BOOT WINNER PREDICTIONS

## 🎯 Objective
Add a new dashboard page showing the top 10 players most predicted to win the **Golden Boot** (top goalscorer) at the 2026 World Cup, sourced from Polymarket Gamma API.

**Source:** `https://polymarket.com/event/world-cup-golden-boot-winner`  
**Gamma slug:** `world-cup-golden-boot-winner` (event ID: 413862)  
**Data:** 80 binary markets — each is "Will [Player] be the top goalscorer?" with Yes/No outcome prices

---

### 14.1 Backend: Golden Boot endpoint (`GET /api/v1/predictions/golden-boot`)
* [ ] New handler `GetGoldenBoot(w, r)` at `GET /api/v1/predictions/golden-boot`
* [ ] Fetch `https://gamma-api.polymarket.com/events?slug=world-cup-golden-boot-winner&closed=false`
* [ ] For each market extract:
  * Player name from question text
  * Yes-probability from `outcomePrices[0]`
* [ ] Sort descending by probability, take top 10
* [ ] Use existing `priceToPercent` helper for float→int conversion
* [ ] In-memory cache with 60s TTL (same pattern as games/standings)
* [ ] Return JSON: `[{ "player": "Lionel Messi", "probability": 52 }, ...]`
* [ ] Returns `[]` on error — no fallback or derivation

### 14.2 Frontend: Golden Boot page
* [ ] Create `src/pages/GoldenBoot.tsx`
* [ ] Fetch `/api/v1/predictions/golden-boot` on mount
* [ ] Top 10 player cards with rank, name, percentage, neon progress bar
* [ ] #1 gold / #2 silver / #3 bronze gradient ranks (matching Pulse Wisdom Wheel style)
* [ ] Loading skeleton (10 shimmer rows)
* [ ] Empty/error state
* [ ] Register `/golden-boot` route in `App.tsx`

### 14.3 Navigation & Testing
* [ ] Add "Golden Boot" nav item to `Layout.tsx`
* [ ] Add unit test `TestGetGoldenBoot` — verify handler returns valid JSON array
* [ ] Create `e2e/golden-boot.spec.ts` — page load + nav click
* [ ] `go test ./...` passes
* [ ] `npx playwright test` passes
* [ ] `docker compose build` + integration verification

---

# PHASE 15: CONTINENT WORLD CUP WINNER PREDICTIONS

## 🎯 Objective
Add a new dashboard page showing which **continent** is predicted to win the 2026 World Cup, sourced from Polymarket Gamma API.

**Source:** `https://polymarket.com/event/which-continent-will-win-the-world-cup`  
**Gamma slug:** `which-continent-will-win-the-world-cup` (event ID: 98349)  
**Data:** 7 binary markets — each is "Will {Continent} win the 2026 WC?" with Yes/No prices

---

### 15.1 Backend: Continent endpoint (`GET /api/v1/predictions/continent`)
* [ ] New handler `GetContinentPredictions(w, r)` at `GET /api/v1/predictions/continent`
* [ ] Fetch `https://gamma-api.polymarket.com/events?slug=which-continent-will-win-the-world-cup&closed=false`
* [ ] For each market extract:
  * Continent name from question text
  * Yes-probability from `outcomePrices[0]`
  * Clean continental labels: UEFA→Europe, CONMEBOL→South America, CONCACAF→North America, CAF→Africa, OCF→Oceania, AFC→Asia
* [ ] Sort descending by probability
* [ ] Filter out "another continent" market (0% placeholder)
* [ ] Use existing `priceToPercent` helper
* [ ] In-memory cache with 60s TTL
* [ ] Return JSON: `[{ "continent": "Europe", "label": "Europe (UEFA)", "probability": 61 }, ...]`
* [ ] Returns `[]` on error — no fallback

### 15.2 Frontend: Continent page
* [ ] Create `src/pages/Continent.tsx`
* [ ] Fetch `/api/v1/predictions/continent` on mount
* [ ] Continent cards with emoji flag, name, confederation label, percentage, neon bar
* [ ] Loading skeleton + empty/error state
* [ ] Register `/continent` route in `App.tsx`

### 15.3 Navigation & Testing
* [ ] Add "Continent" nav item to `Layout.tsx`
* [ ] Add unit test `TestGetContinentPredictions` — verify handler returns valid JSON
* [ ] Create `e2e/continent.spec.ts` — page load + nav click
* [ ] `go test ./...` passes
* [ ] `npx playwright test` passes
* [ ] `docker compose build` + verification

---

# PHASE 16: PULSE ORACLE UI ENHANCEMENT (Wheel + Polish)

## 🎯 Objective
Upgrade the Pulse Oracle page with a **spinning wheel component** for the top 10 nations below the title, remove the Match Oracle section, and keep the half-width layout ready for a continent list on the right.

---

### 16.1 Wisdom Wheel Component (`frontend/src/components/WisdomWheel.tsx`)
* [ ] Create a standalone `WisdomWheel.tsx` component
* [ ] Data source: `/api/v1/predictions/global` (same endpoint, unchanged)
* [ ] Fetch flag icons from `https://flagsapi.com/{CODE}/flat/48.png` (team→country code mapping from Standings)
* [ ] Design a **circular wheel layout** with 10 segments (one per nation)
* [ ] Each segment displays: flag icon + team name + probability percentage
* [ ] **Slow spinning animation** via CSS transform rotate — continuous, subtle rotation (e.g. 30s–60s per full rev)
* [ ] Pause on hover (so users can read a segment)
* [ ] Fallback: static list if wheel can't render (accessibility)
* [ ] Loading skeleton state for the wheel (pulsing circle)

### 16.2 Integrate Wheel into Pulse Oracle (`frontend/src/pages/PulseDashboard.tsx`)
* [ ] Import `WisdomWheel` in `PulseDashboard.tsx`
* [ ] Render `<WisdomWheel>` **right below the "Pulse Oracle" title**, before the grid
* [ ] Keep the Wisdom Wheel inline list in the **left column** (`lg:col-span-7`) — unchanged from current layout

### 16.3 Remove Match Oracle Section
* [ ] Delete the `MatchOracleList` function component entirely
* [ ] Delete the `OracleListSkeleton` function (no longer needed)
* [ ] Remove the Match Oracle fetch call from `useEffect`
* [ ] Remove the `oracle` and `loadingOracle` state variables
* [ ] Remove the imports for `UpcomingMatch` type (no longer used)
* [ ] Keep the **right column empty** as a placeholder (`lg:col-span-5`) — ready for continent list later

### 16.4 Full-Width Progress Bars in Wisdom Wheel Inline List
* [ ] Change progress bar widths from proportional (`fav.probability%`) to **full width (100%)**
* [ ] Keep the neon gradient styling (cyan→blue→indigo) as a decorative full bar
* [ ] Display probability percentage as text overlay or next to the bar

### 16.5 Testing
* [ ] Verify Pulse Oracle page loads with spinning wheel + half-width wisdom list + empty right column
* [ ] Confirm flag icons render from flagsapi.com
* [ ] Confirm Match Oracle is completely gone (no card, no ghost)
* [ ] All existing Go tests pass (backend unchanged)
* [ ] All existing Playwright tests pass
