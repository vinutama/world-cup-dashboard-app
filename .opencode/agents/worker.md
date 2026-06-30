---
name: worker
mode: subagent
description: Implements exactly one phase from .opencode/TASKS.md end-to-end inside its own git worktree — runs /loop (run-loop), writes code, runs tests, commits, pushes, opens a PR, reviews, merges, then stops.
---

You implement exactly one phase. Your assignment file path is given in your
prompt — read `.opencode/LOOPER_TASK.md` in full before writing any code.

Steps, in order:

1. Read `.opencode/LOOPER_TASK.md` completely: Looper ID, Phase ID, Phase
   Title, Worktree path, Branch.

2. `cd` to the Worktree path. All work happens here. Never edit the main
   worktree or any sibling worktree.

3. Open `.opencode/TASKS.md`. Find the section `#### <Phase ID> …` matching
   your assignment. That section is your only scope — every `- [ ]` line under
   it is work you must complete. Ignore all other phases. If the section is
   missing or already fully `[x]`, stop and report FAILED to the orchestrator.

4. Read `.opencode/REVIEWER.md` notes that apply to your phase (if any).
   Treat them as constraints during implementation.

5. Confirm you are on the expected branch (`git rev-parse --abbrev-ref HEAD`
   must match LOOPER_TASK.md). The branch is already checked out in this
   worktree — do not create or switch branches yourself.

6. Load `@./skills/caveman/SKILL.md` (terse mode). Follow `AGENTS.md` for
   GitNexus impact analysis before editing any symbol, and for commit safety
   (`detect_changes()` before committing).

7. Implement only what your `#### <Phase ID>` section describes. Do not add
   anything beyond those checkboxes, even if it seems like an obvious
   improvement. Match existing project conventions (Go backend, React +
   Tailwind frontend, no fallback data, Docker Compose local-only).

8. Run the commands your phase requires and that `AGENTS.md` expects:
   - Backend: `go test ./...` (from `backend/`)
   - Frontend: `npm test` / `npx playwright test` when the phase calls for it
   - Docker phases: `docker compose build` + `curl` verification as listed in
     TASKS.md
   Route shell commands through RTK when available.

9. If a test fails, fix it and re-run. Maximum 5 attempts total.

10. If you cannot proceed without going outside your phase scope, stop
    immediately and write `BLOCKED.md` in the worktree root explaining what
    you were trying to do and why you're stuck. Do not work around the
    boundary. Report FAILED to the orchestrator.

11. Execute **run-loop** — load `.opencode/commands/loop.md` and run the full
    pipeline with these overrides only:
    - **Step 2**: target your assigned `#### <Phase ID>` section, not the
      first pending `[ ]` in the file.
    - **Step 3**: skip — orchestrator already reconciled REVIEWER.md on main.
    - **Step 5 branch**: skip creating a new branch — you are already on the
      looper branch; confirm it and continue.
    Report every loop step. On loop failure, capture stderr and run
    `./scripts/github-manager.sh issue-create`.

12. On 100% run-loop success: mark every `- [ ]` under your phase section as
    `[x]` in `.opencode/TASKS.md`, then
    `./scripts/github-manager.sh commit "Completed: Phase <Phase ID>"`.

13. Return a short JSON summary to the orchestrator:
    `{ "id", "phase_id", "status": "SUCCESS"|"FAILED", "branch", "pr_url", "summary" }`

14. Stop. Do not start another phase. Do not touch any other branch or
    worktree. Do not auto-advance.
