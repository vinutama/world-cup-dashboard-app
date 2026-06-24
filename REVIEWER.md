# REVIEWER.md — Tech Lead Review of TASKS.md

**Reviewer:** Tech Lead
**Status:** ⏳ Changes Requested
**Reviewed:** Pre-implementation

---

## 1. Data Source Discovery Gap

**Issue:** The data source (`openfootball/worldcup.json`) is organized as **one `worldcup.json` per year** in separate directories (1930, 1934, …, 2026). TASKS.md assumes a single fetch from one URL, but the app needs to:
1. First **discover which years** exist (list the repo directories)
2. Then **fetch each year** individually
3. Then **aggregate** into a unified list of tournaments

**Suggested Fix:** Split Task 2.1 into two sub-tasks:

| Before | After |
|--------|-------|
| "Fetch data from one URL and parse" | **2.1a** — Year discovery: list available years from the repo |
| | **2.1b** — Per-year fetcher: fetch each year's `worldcup.json`, parse, unify |

Update the API accordingly — the year filter needs a distinct list of available years before it can function.

---

## 2. Missing API Endpoints

The data structure exposes more fields than the current API plan covers. Each `worldcup.json` has:
- `name` (e.g., "World Cup 2018")
- `matches[]` — each with `round`, `date`, `time`, `team1`, `team2`, `score` (`ft`, `ht`), `goals1[]`, `goals2[]` (with `name`, `minute`, `offset`, `owngoal`, `penalty`), `group`, `ground`

### 2.1 — Missing: `GET /api/years`
- **Why:** The year filter dropdown needs a list of available years to render. Currently, the tournaments list consumes both concerns (list + filter). The client needs an endpoint that returns just `[1930, 1934, …, 2022, 2026]` to populate the filter control before the user makes a selection.
- **Suggested Fix:** Add `GET /api/years` returning available year IDs.

### 2.2 — Missing: `GET /api/tournaments/:id`
- **Why:** The current plan has `GET /api/tournaments` (list) and `GET /api/tournaments?year=:year` (filter), but no single-tournament detail endpoint. The match-browse view needs tournament metadata (name, host nations, etc.) without fetching all tournaments.
- **Suggested Fix:** Add `GET /api/tournaments/:id` returning the tournament's `name` and basic metadata.

### 2.3 — Missing: `GET /api/health`
- **Why:** Docker Compose needs a health check to know when the backend is ready. CI needs to verify the service is running before E2E tests start. No endpoint for this exists.
- **Suggested Fix:** Add `GET /api/health` returning `{"status": "ok"}`.

---

## 3. Missing Frontend Screens / States

### 3.1 — No Welcome / Landing View
- **Issue:** The app currently launches directly into the tournaments list with no onboarding, branding, or context. For a dashboard, a landing/home page provides orientation.
- **Suggested Fix:** Add a minimal home screen as a child of 4.1 with:
  - App title / branding
  - Quick stats row (number of past World Cups, years range)
  - "Browse Tournaments" CTA

### 3.2 — No 404 / Not-Found Screen
- **Issue:** The router maps to three views, but navigating to an invalid route (e.g., `/settings`) will produce a blank page or an error.
- **Suggested Fix:** Add a catch-all 404 route in Task 4.1.

### 3.3 — No Global Error Boundary
- **Issue:** If the backend API is unreachable or returns a 500, each view handles it independently, leading to inconsistent UX.
- **Suggested Fix:** Add a top-level error boundary in Task 4.1 that catches unhandled errors and shows a consistent "Something went wrong" view with a retry action.

---

## 4. Incorrect / Premature Dependencies

### 4.1 — Task 1.2 (Docker Compose) in Phase 1
- **Problem:** Docker Compose is placed in Phase 1 with only Task 1.1 as a dependency. But Dockerfiles **cannot be written** until the tech stack is chosen (Python vs Node vs Go for backend; React vs Vue vs Svelte for frontend), which happens during Tasks 2.1–4.1.
- **Risk:** Dockerfiles written in Phase 1 will need to be re-written when the actual stack is selected, or worse, they'll constrain the tech choice.
- **Suggested Fix:** Move Task 1.2 to Phase 5, immediately before release verification. Make it depend on **Task 3.1** (backend) and **Task 4.4** (frontend) so the Dockerfiles are written against working services with a known stack.

### 4.2 — Task 1.1 CI Configuration is Premature
- **Problem:** CI pipeline config (e.g., `.github/workflows/ci.yml`) needs to know the build toolchain, test framework, and lint commands. These aren't decided until the backend and frontend tech stacks are chosen.
- **Suggested Fix:** Move CI config from Task 1.1 to a **Task 5.0** (pre-Phase-5), or mark it as "stub initially, finalize after stack is chosen."

### 4.3 — Task 5.1 (E2E Testing) Missing Docker Dependency
- **Problem:** E2E tests verify "frontend + backend together via Docker Compose," but 5.1's dependencies only list Tasks 3.1 and 4.4. It also needs Task 1.2 (Docker Compose).
- **Suggested Fix:** Add Task 1.2 to 5.1's dependency list.

---

## 5. Missing Cross-Cutting Concerns

### 5.1 — CORS Configuration
- **Issue:** The frontend dev server runs on a different port (e.g., `:5173`) than the backend (e.g., `:8000`). No CORS setup is mentioned anywhere.
- **Suggested Fix:** Add a sub-task to **Task 3.1**: "Configure CORS middleware to allow frontend origin."

### 5.2 — Data Refresh Strategy
- **Issue:** The data fetcher caches on first load, but there's no strategy for **when to refresh**. An MVP can cache forever, but this should be an explicit decision.
- **Suggested Fix:** Add a note to Task 2.1: "Decide refresh strategy: cache-once (MVP) or periodic re-fetch with TTL."

### 5.3 — Logging Strategy
- **Issue:** No logging or observability is mentioned. Debugging issues in Docker/CI without logs is painful.
- **Suggested Fix:** Add a sub-task to Task 3.1: "Add structured logging (request ID, method, path, status, duration)."

---

## 6. Over-Scoped Items

### 6.1 — Task 5.2 "Self-Review & Bug Fixes" is Unbounded
- **Issue:** "Run full review" has no exit criteria. What counts as "done"? Without a checklist, this task could loop forever.
- **Suggested Fix:** Replace with concrete sub-tasks:
  - 5.2a — Static analysis pass (run all linters, fix warnings)
  - 5.2b — Security audit (check for exposed secrets, XSS, injection)
  - 5.2c — Performance audit (check bundle size, API response times)
  - 5.2d — UX walkthrough (manual click-through of all flows)
  - 5.2e — File issues for all findings

### 6.2 — "E2E Testing" Scope Creep Risk
- **Issue:** Writing comprehensive E2E tests for an MVP can exceed the time spent on actual features. The current description ("cover: browse tournaments → filter → view matches → view match detail") could balloon into dozens of test cases.
- **Suggested Fix:** Scope Task 5.1 explicitly: "Write exactly **one E2E test per user story** (3 tests max). Use the happy path only. Edge cases are covered by unit/integration tests."

---

## 7. Database Schema Decision

**Issue:** TASKS.md doesn't mention a database at all. The data source is JSON from GitHub, but the MVP has two options:

| Approach | Pro | Con |
|----------|-----|-----|
| **No DB** (in-memory cache of fetched JSON) | Zero setup, fast iteration | Data lost on restart; re-fetches on every boot |
| **SQLite DB** (persisted to disk) | Survives restarts; enables queries (search, stats) | Adds schema design + migration overhead |

**Suggested Fix:** For an MVP, **no DB is the right call**. But this must be **explicitly decided and documented** in Task 2.1 or a new Task 2.0 "Architecture Decision Record." Add a note:
> "Decision: Use in-memory cache with file-based JSON fallback. No database required for MVP."

---

## Summary of Required Changes

| # | Severity | Area | Change |
|---|----------|------|--------|
| 1 | 🔴 High | Data Layer | Split Task 2.1 into discovery + fetch |
| 2 | 🔴 High | API | Add `GET /api/years`, `GET /api/tournaments/:id`, `GET /api/health` |
| 3 | 🟡 Medium | Frontend | Add welcome screen, 404 route, error boundary |
| 4 | 🟡 Medium | Dependencies | Move Docker Compose to Phase 5 |
| 5 | 🟡 Medium | Dependencies | Defer CI config until stack is chosen |
| 6 | 🟡 Medium | Dependencies | Add Task 1.2 to E2E test dependency |
| 7 | 🟡 Medium | Cross-cutting | Add CORS, logging, data refresh decision |
| 8 | 🟢 Low | Scope | Refine Task 5.2 with concrete exit criteria |
| 9 | 🟢 Low | Scope | Scope-limit E2E tests to 3 happy-path tests |
| 10 | 🟢 Low | Data | Document no-DB decision explicitly |

---

**Verdict:** ⏳ **Conditionally approved** — address the high-severity gaps (#1, #2) before implementation begins. Medium-severity items (#3–#7) should be resolved before Phase 3. Low items (#8–#10) can be fixed inline during development.
