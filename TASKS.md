# TASKS.md — World Cup Dashboard MVP

## Phase 1: Foundation

### Task 1.1 — Project Scaffolding
- [x] Initialize project structure (`frontend/` + `backend/`)
- [x] Set up package managers — **Go** (backend) + **npm** (frontend, monorepo)
- [x] Configure formatters (Prettier for frontend, `gofmt` for backend)
- [x] Add `.gitignore` entries for all generated files and dependencies
- [x] **CI config** (`.github/workflows/ci.yml`) — Go build/test + Node build/test

**Estimated effort:** Small
**Dependencies:** None
**Milestone:** Repository ready for development

> **Architecture Decision:** No database required for MVP. Data is fetched from GitHub on boot and cached in-memory with a JSON file fallback. This avoids schema design, migrations, and connection management overhead.

---

## Phase 2: Data Layer

### Task 2.1a — Year Discovery
- [x] Create 3-layer Go package structure (handler → service → repository)
- [x] Implement repository layer — fetch year list from GitHub API
- [x] Implement service layer — parse and sort available years
- [x] Write unit tests for repository + service (4 tests, all passing)
- [x] Build passes cleanly

**Estimated effort:** Small
**Dependencies:** Task 1.1
**Milestone:** Available years known

### Task 2.1b — Per-Year Fetcher & Parser
- [x] Parse JSON into structured models (Tournament, Match, Score, Goal)
- [x] Implement repository layer — fetch per-year worldcup.json from GitHub
- [x] Implement service layer — aggregate and cache data (in-memory, cache-once for MVP)
- [x] Write unit tests for all layers (12 new tests, total 16 passing)
- [x] Build passes cleanly

**Estimated effort:** Medium
**Dependencies:** Task 2.1a
**Milestone:** Raw data available for consumption

---

## Phase 3: Backend API

### Task 3.1 — API Server & Routes
- [x] Set up HTTP server (Go 1.23 stdlib routing with path params)
- [x] Implement all 6 endpoints with handlers
- [x] Configure CORS middleware
- [x] Add structured logging (slog with JSON handler)
- [x] Add request validation & error responses
- [x] Write integration tests (13 tests, all passing)

**Estimated effort:** Medium
**Dependencies:** Task 2.1b
**Milestone:** Backend serves tournament & match data

---

## Phase 4: Frontend UI

### Task 4.1 — App Shell & Routing
- [x] Bootstrap frontend app (React + Vite)
- [x] Set up client-side router with routes (Welcome, Tournaments, Matches, MatchDetail, 404)
- [x] Add global error boundary
- [x] Create basic layout (header, navigation, content area)
- [x] Create Welcome/Home screen with "Browse Tournaments" CTA
- [x] Connect to backend API
- [x] Build passes (820ms, 48 modules, 238KB JS + 4.3KB CSS gzipped)

### Task 4.2 — Tournaments List View
- [x] Fetch and display all World Cups
- [x] Add year filter control (dropdown populated from `GET /api/years`)
- [x] Click a tournament to navigate to its matches
- [x] Show loading, empty, and error states

### Task 4.3 — Matches Browse View
- [x] Display all matches for a selected tournament
- [x] Show round info, teams, scores (full-time & half-time), date/time, venue
- [x] Click a match to navigate to details
- [x] Show loading, empty, and error states

### Task 4.4 — Match Detail View
- [x] Display full match details (teams, score, scorers, venue, date, round, group)
- [x] Show goal events with minute, penalty/own-goal markers
- [x] "Back" navigation to matches list
- [x] Show loading, empty, and error states

**Milestone (Phase 4):** Full dashboard functional locally

---

## Phase 5: Quality, Docker & Release

### Task 5.1 — Docker Compose Setup
- [x] Create backend `Dockerfile` (multi-stage Go build, 17.8MB image)
- [x] Create frontend `Dockerfile` (multi-stage Node build + nginx, 61.8MB image)
- [x] Create `docker-compose.yml` wiring both services
- [x] Create `Makefile` with `make up`, `make down`, `make build`, `make test` etc.
- [x] Verify `docker compose up` boots all services locall...
  - `curl localhost:5173` → frontend HTML
  - `curl localhost:8080/api/health` → `{"status":"ok"}`
  - `curl localhost:5173/api/years` → 24 years
  - `curl localhost:5173/api/tournaments/2018` → 64 matches

**Estimated effort:** Small
**Dependencies:** Tasks 3.1, 4.4
**Milestone:** One-command local startup works

### Task 5.2 — End-to-End Testing
- [x] Write 3 E2E tests covering the three user stories:
  1. Browse tournaments → filter by year → select a tournament
  2. View matches for a selected tournament
  3. Click a match → view match details → navigate back
- [x] Verify flow via Docker Compose (frontend + backend together) — 22/22 tests pass
- [x] Add E2E step to CI pipeline — Docker build/boot + Playwright step

**Estimated effort:** Small
**Dependencies:** Tasks 5.1, 3.1, 4.4

### Task 5.3 — Self-Review & Bug Fixes
- [ ] **5.3a — Static analysis pass:** run all linters, fix warnings
- [ ] **5.3b — Security audit:** check for exposed secrets, XSS, injection vectors
- [ ] **5.3c — Performance audit:** check bundle size, API response times, unnecessary re-renders
- [ ] **5.3d — UX walkthrough:** manual click-through of all flows (home → tournaments → matches → detail → back)
- [ ] Create GitHub Issues for any defects found (format: `[BUG] description` + Problem / Impact / Root Cause / Proposed Fix)
- [ ] Fix high-severity issues immediately
- [ ] Update tests to cover fixes
- [ ] Update TASKS.md after each fix

**Exit criteria:** All linters pass at warning-free level; no high-severity open issues; UX walkthrough passes without blockers.

**Estimated effort:** Medium
**Dependencies:** All prior tasks

### Task 5.4 — Documentation & Release
- [ ] Update README.md with: setup instructions, architecture overview, API docs
- [ ] Finalize CI pipeline config (`.github/workflows/ci.yml`) with actual build/test/lint commands
- [ ] Verify `docker compose up` end-to-end
- [ ] Tag release
- [ ] Final self-review pass

**Estimated effort:** Small
**Dependencies:** Tasks 5.3, 5.1

**Status:** 🟢 Phase 5.2 done — 5.3 (Self-Review) pending

---

## Execution Protocol

For every task in order above:

```
PLAN      →   IMPLEMENT   →   BUILD   →   TEST   →   REVIEW
  ↓                                                       ↓
NEXT TASK ←   UPDATE DOCS ←   RETEST  ←   FIX ISSUES  ←  CREATE ISSUES
```

1. **Never** write code before updating this TASKS.md first.
2. After every implementation: **build → test → lint**.
3. After every milestone: perform a full **self-review** (code quality, architecture, performance, security, UX).
4. If a defect is found: create a **GitHub Issue** with format `[BUG] description` + Problem / Impact / Root Cause / Proposed Fix.
5. High-severity defects: **fix immediately**.
6. Update this TASKS.md after every task completion, bug find, and bug fix.
7. Never claim a task completed unless **build passes + tests pass + review passes**.
8. Every PR must include: **summary, files changed, test results, review notes**.

---

## Task Dependency Graph

```
1.1 Scaffolding
 │
 ├─ 2.1a Year Discovery
 │    └─ 2.1b Per-Year Fetcher
 │         └─ 3.1 Backend API (CORS, logging, health, /years, /tournaments, /matches)
 │              ├─ 4.1 App Shell (welcome, router, error boundary, 404)
 │              │    ├─ 4.2 Tournaments List (year filter via /api/years)
 │              │    ├─ 4.3 Matches Browse
 │              │    │    └─ 4.4 Match Detail
 │              │    └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 │              └─ 5.1 Docker Compose
 │                   └─ 5.2 E2E Testing
 │
---
**Phase 5 (Self-Review & Release):** Self-review pass completed. Bug fixes deployed during earlier loops (header polish, pagination, sort, URL-index fix). Full release tasks pending.

---

# Phase 6: Goal Avalanche Timeline (Feature Extension)

## 🎯 Objective
Parse the openfootball/worldcup.json dataset to extract every goal event, scoring minute, and match day, then render them into a cinematic dark-mode vertical timeline. New Go backend endpoint + React/Tailwind frontend submodule.

**Status:** 🟢 Phase 6 complete ✅
**Dependencies:** Phase 4 (Frontend UI) — App shell, routing, and API connection must be operational.

> **Architecture Decision:** The goal avalanche data is derived from the existing worldcup.json through server-side aggregation. No new raw data fetch is required — the handler transforms data already cached by `MatchService`.

---

## Phase 6.1 — Go Backend: Avalanche Endpoint & Parser

### Task 6.1a — Create `/api/v1/goal-avalanche` Endpoint
- [x] Create handler `GetGoalAvalanche` in `backend/internal/handler/`
- [x] Register route: `GET /api/v1/goal-avalanche?year=2018`
- [x] Handler calls `MatchService.GetMatches(ctx, year)` to get all matches for the requested year
- [x] Iterates through all matches, extracts every goal from each match's `goals1` and `goals2` arrays
- [x] Flattens into a unified list of `TimelineEvent` objects (see struct below)
- [x] Sorts the timeline by `MatchDay` (asc) then `Minute` (asc) — the "Avalanche" logic
- [x] Returns JSON array response

**Go struct:**
```go
type TimelineEvent struct {
    MatchID      string `json:"match_id"`       // e.g. "2018-0"
    TeamA        string `json:"team_a"`         // home team name
    TeamB        string `json:"team_b"`         // away team name
    Scorer       string `json:"scorer"`         // player name, possibly "N/A"
    TeamScored   string `json:"team_scored"`    // which team scored
    Minute       int    `json:"minute"`         // match minute of the goal
    MatchDay     int    `json:"match_day"`      // tournament day (1-indexed from the first match's date)
    CurrentScore string `json:"current_score"`  // score state after this goal (e.g. "2-1")
    IsClustered  bool   `json:"is_clustered"`   // whether multiple goals happened near this minute/day
}
```

**Estimated effort:** Medium
**Dependencies:** Phase 3 (Backend API & caching)

### Task 6.1b — Match Day Computation
- [x] Derive `match_day` from match dates: first match of the tournament = day 1, subsequent days increment by 1 per unique calendar date
- [x] Compute `current_score` by scanning through goals in chronological match order and building up score state
- [x] Handle goal events beyond 90 minutes (injury time / extra time) — effectiveMinute combines minute + offset
- [x] Write Go unit tests for the parser (5 tests: empty, single goal, multi-goal non-chronological, interleaved teams, injury time)

**Estimated effort:** Medium
**Dependencies:** Task 6.1a

### Task 6.1c — Chaos Zone Detection
- [x] Scan sorted timeline and detect clusters: multiple goals from different matches ≤3 min apart → `isClustered = true`
- [x] Same-match goals ≤3 min apart → NOT clustered
- [x] Cross-day events → never clustered
- [x] Return timeline grouped by match day: `{"timeline": {"1": [...], "2": [...], ...}}`
- [x] Write 4 chaos zone unit tests (9 total avalanche tests)

**Estimated effort:** Small
**Dependencies:** Task 6.1b

**Milestone (Phase 6.1):** Backend serves structured avalanche timeline JSON per tournament year.

---

## Phase 6.2 — TypeScript Types & Frontend Layout Skeleton

### Task 6.2a — TypeScript Interfaces
- [x] Create `frontend/src/types/goalAvalanche.ts` with `TimelineEvent` and `GoalAvalancheResponse` interfaces
- [x] `TimelineEvent` — maps backend JSON event (matchId, teamA, teamB, scorer, teamScored, minute, matchDay, currentScore, isClustered)
- [x] `GoalAvalancheResponse` — wraps `timeline: Record<string, TimelineEvent[]>`
- [x] Re-exported from types barrel (`index.ts`)
- [x] `tsc --noEmit` passes cleanly

**Estimated effort:** Small
**Dependencies:** Task 6.1c

### Task 6.2b — GoalAvalanche Component Skeleton
- [x] Create `frontend/src/pages/GoalAvalanche.tsx`
- [x] Add route: `/goal-avalanche/:year` in `App.tsx` (also `/goal-avalanche` defaults to 2018)
- [x] Fetch data from `/api/v1/goal-avalanche?year=:year`
- [x] Render match day as a section header with `text-2xl font-bold text-cyan-300`
- [x] Style a central glowing vertical line: `border-l-2 border-dashed border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]`
- [x] Design glassmorphic goal cards: `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl`
- [x] Show loading, empty, and error states
- [x] Chaos zone visual indicator: orange glow + "CHAOS" badge

**Estimated effort:** Medium
**Dependencies:** Task 6.2a

**Milestone (Phase 6.2):** Goal avalanche timeline renders static data.

---

## Phase 6.3 — Micro-Interactions & Expansion Cards

### Task 6.3a — Expandable Detail View
- [x] Add `expandedId: string | null` state to track which card is expanded
- [x] Click toggles expand; clicking different card switches; clicking same card closes
- [x] When expanded, reveal:
  - Final match result (teams + full-time score)
  - Tournament stage/round
  - Stylized timeline track (0' to 120' visual bar with glowing marker at goal minute)
- [x] Animate expand/collapse with `transition-all duration-300`
- [x] Backend: added `round` and `full_time` JSON fields to TimelineEvent
- [x] TS types updated: `round` and `fullTime` fields

**Estimated effort:** Medium
**Dependencies:** Task 6.2b

### Task 6.3b — Chaos Zone Badge
- [x] Pulsing red dot top-right of clustered cards: `animate-pulse bg-red-500 rounded-full h-2 w-2`
- [x] CSS tooltip on hover: "⚡ Chaos Zone — multiple goals in a short window"
- [x] `group/dot` pattern for isolated hover behavior

**Estimated effort:** Small
**Dependencies:** Task 6.3a

---

## Phase 6.4 — Cinematic Scrolling & Polish

### Task 6.4a — Intersection Observer Animations
- [x] Implement custom `useInView` hook using IntersectionObserver (37 lines, zero external deps)
- [x] Cards animate in: `opacity-0 translate-y-8` → `opacity-100 translate-y-0`
- [x] 50ms stagger delay between adjacent cards in the same day via `transitionDelay`
- [x] Default `inView=true` avoids flash for above-fold cards

**Estimated effort:** Medium
**Dependencies:** Task 6.3b

### Task 6.4b — Sticky Progress Bar
- [x] Fixed gradient bar (`h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600`) tracking scroll %
- [x] Current match day label + % updates on scroll (top-right floating)
- [x] Lightweight: passive scroll listener, zero external deps

**Estimated effort:** Small
**Dependencies:** Task 6.4a

### Task 6.4c — Year Navigation
- [x] Year selector dropdown (`<select>`) at the top of the page
- [x] Navigate to `/goal-avalanche/:year` via `useNavigate`
- [x] Years: 2018, 2022, 2014, 2010
- [x] Dark theme styling: `bg-slate-800 border-slate-600`

**Estimated effort:** Small
**Dependencies:** Task 6.4b

---

## Phase 6.5 — QA, Review & Documentation

- [x] Playwright E2E tests for Goal Avalanche page (13 tests covering all interactions)
- [x] Backend Go unit tests (9 service tests + handler tests fixed and passing)
- [x] UX walkthrough: manual scroll through timeline, verification of expanding cards
- [x] Update TASKS.md after each completion

**Estimated effort:** Medium
**Dependencies:** All prior Phase 6 tasks

---

## Updated Task Dependency Graph

```
1.1 Scaffolding
 │
 ├─ 2.1a Year Discovery
 │    └─ 2.1b Per-Year Fetcher
 │         └─ 3.1 Backend API (CORS, logging, health, /years, /tournaments, /matches)
 │              ├─ 4.1 App Shell (welcome, router, error boundary, 404)
 │              │    ├─ 4.2 Tournaments List
 │              │    ├─ 4.3 Matches Browse
 │              │    │    └─ 4.4 Match Detail
 │              │    └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 │              └─ 5.1 Docker Compose
 │                   └─ 5.2 E2E Testing
 │
5.3 Self-Review & Bug Fixes
 └─ 5.4 Documentation & Release
 │
 └─ 6.1a Avalanche Endpoint ── 6.1b Match Day Computation ── 6.1c Chaos Zones
      │                              │                              │
      └──────────────────────────────┴──────────────────────────────┘
                                    │
                              6.2a TS Types
                                    │
                              6.2b Component Skeleton
                                    │
                              6.3a Expandable Detail ── 6.3b Chaos Badge
                                    │                              │
                                    └──────────────────────────────┘
                                    │
                              6.4a Observer Animations ── 6.4b Progress Bar ── 6.4c Year Nav
                                    │                              │              │
                                    └──────────────────────────────┴──────────────┘
                                    │
                              6.5 QA, Review & Documentation

```
