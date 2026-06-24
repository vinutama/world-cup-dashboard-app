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
- [ ] Bootstrap frontend app (React / Vue / Svelte)
- [ ] Set up client-side router with routes:

  | Route | View |
  |-------|------|
  | `/` | Welcome / Home |
  | `/tournaments` | Tournaments list |
  | `/tournaments/:id/matches` | Matches browse |
  | `/matches/:id` | Match detail |
  | `*` | 404 Not Found |

- [ ] Add **global error boundary** — catches unhandled errors and shows a consistent "Something went wrong" view with retry action
- [ ] Create basic layout (header, navigation, content area)
- [ ] Create **Welcome/Home screen** with app title, quick stats, and "Browse Tournaments" CTA
- [ ] Connect to backend API

**Estimated effort:** Medium
**Dependencies:** Task 3.1

### Task 4.2 — Tournaments List View
- [ ] Fetch and display all World Cups
- [ ] Add year filter control (dropdown populated from `GET /api/years`)
- [ ] Click a tournament to navigate to its matches
- [ ] Show loading, empty, and error states
- [ ] Write component tests

**Estimated effort:** Medium
**Dependencies:** Task 4.1

### Task 4.3 — Matches Browse View
- [ ] Display all matches for a selected tournament
- [ ] Show round info, teams, scores (full-time & half-time), date/time, venue
- [ ] Click a match to navigate to details
- [ ] Show loading, empty, and error states
- [ ] Write component tests

**Estimated effort:** Medium
**Dependencies:** Task 4.1

### Task 4.4 — Match Detail View
- [ ] Display full match details (teams, score, scorers, venue, date, round, group)
- [ ] Show goal events with minute, penalty/own-goal markers
- [ ] "Back" navigation to matches list
- [ ] Show loading, empty, and error states
- [ ] Write component tests

**Estimated effort:** Small
**Dependencies:** Task 4.3

**Milestone (Phase 4):** Full dashboard functional locally

---

## Phase 5: Quality, Docker & Release

### Task 5.1 — Docker Compose Setup
- [ ] Create backend `Dockerfile` (now that stack is known)
- [ ] Create frontend `Dockerfile` (or static server)
- [ ] Create `docker-compose.yml` wiring both services
- [ ] Verify `docker compose up` boots all services locally

**Estimated effort:** Small
**Dependencies:** Tasks 3.1, 4.4
**Milestone:** One-command local startup works

### Task 5.2 — End-to-End Testing
- [ ] Write exactly **3 E2E tests** covering the three user stories (happy path only):
  1. Browse tournments → filter by year → select a tournament
  2. View matches for a selected tournament
  3. Click a match → view match details → navigate back
- [ ] Verify flow via Docker Compose (frontend + backend together)
- [ ] Add E2E step to CI pipeline

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

**Milestone (Phase 5):** MVP complete, documented, and releasable

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
5.3 Self-Review & Bug Fixes (static analysis, security, perf, UX)
 └─ 5.4 Documentation & Release (CI finalized, README, tag)
```
