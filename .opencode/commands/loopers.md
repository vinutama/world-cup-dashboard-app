# Command: /loopers
# Alias: /looper
# Alias: run-loopers
# Alias: concurrent-loop

## Purpose

Spawn **N concurrent Worker sub-agents** (`@./.opencode/agents/worker.md`, `mode: subagent`), each in its own **git worktree**, each running **`/loop`** (`run-loop`) for one **auto-resolved phase** from `.opencode/TASKS.md`.

**Hermes** is the orchestrator. It receives messages from **Telegram** (or direct chat), parses phase ids, validates against `TASKS.md`, spawns workers, monitors, reconciles main.

---

## Telegram / Hermes Message Parsing

Hermes treats the inbound message body as the `/loopers` input. Strip bot prefix, `/loopers`, `/looper`, or `looper` keyword first.

### Supported formats

| Pattern | Example | Result |
|---------|---------|--------|
| Explicit count + T-lines | `looper 2`<br>`T1. 13.1`<br>`T2. 13.2` | 2 workers → phase 13.1, 13.2 |
| Phase list after looper | `looper 13.1 13.2` | 2 workers (N inferred) |
| Comma / and separated | `do 13.1 and 13.5` | 2 workers |
| Bare phase ids | `13.1, 13.2` | 2 workers |
| Phase keyword | `phase 13.1 phase 13.2` | 2 workers |
| Auto-fill pending | `looper 2` (no T-lines) | next 2 pending phases from TASKS.md |
| Single phase | `13.1` or `do phase 13.1` | 1 worker |

### Parse algorithm (Hermes — run before spawn)

```
1. NORMALIZE message (lowercase trim, collapse whitespace)
2. EXTRACT phase id candidates via regex: \b(\d+\.\d+)\b
   Also match T<n>. lines: /^T\d+\.\s*(.+)$/im → extract \d+\.\d+ from capture
3. If zero phase ids found AND message matches /looper\s+(\d+)/:
   N = captured count
   RUN: ./scripts/loopers-worktree.sh next-pending N
   → use returned phase ids
4. DEDUPE phase ids, preserve order
5. For each phase id, RESOLVE:
   RUN: ./scripts/loopers-worktree.sh resolve <phase>
   → phase_id|title|pending|done|status
   - NOT_FOUND → reply Telegram: "Phase X not in TASKS.md"
   - DONE → reply: "Phase X already complete, skipping"
   - READY → include in spawn batch
6. N = count of READY phases. Cap at 4.
7. REPORT resolved table to user/Telegram before spawning
```

### Telegram reply (orchestrator, before spawn)

```
🔄 /loopers batch — N workers

| # | Phase | Title | Pending |
|---|-------|-------|---------|
| 1 | 13.1 | Backend: fetchGammaMatchSlugs | 6 |
| 2 | 13.2 | Backend: fetchGammaMatchOdds | 7 |

Spawning worktrees…
```

---

## Input Format (reference)

```
looper [<N>]
T1. <phase id or description>    # optional if phase ids inline
T2. ...
```

**Examples:**

```
looper 2
T1. 13.1
T2. 13.2
```

```
looper 13.1 13.2
```

```
looper 2
```
(auto-picks next 2 pending phases via `next-pending`)

**Rules:**
- Phase ids must match `#### <id>` headers in `.opencode/TASKS.md` (e.g. `13.1`, `13.5`).
- If `N` given, must match resolved READY phase count (or omit N — infer from list).
- Max concurrent workers: **4**.
- Reject batch if two READY phases share high-conflict files (both backend `handler.go` sections) — warn on Telegram and ask confirm.

---

## Prerequisites (orchestrator — run once before spawning)

- Agent: load `@./skills/caveman/SKILL.md` (terse mode)
- Token economy: **RTK** active — all shell commands via `rtk` proxy
- Code Intel: `npx gitnexus analyze` on main worktree
- **REPORT**: announce all 3 tools before spawning sub-agents

---

## Directive Expansion

[SYSTEM OVERRIDE: AUTOMATIC PROTOCOL LOOPERS.md ENGAGED]

### Phase A — Orchestrator Setup (Hermes)

1. **Parse Telegram/message** — run parse algorithm above; resolve all phase ids via `./scripts/loopers-worktree.sh resolve <id>`.
2. **Validate** — each phase must be `READY` (has pending `[ ]` under `#### <id>`). Skip `DONE`; abort on `NOT_FOUND`.
3. **Conflict check** — warn if multiple phases touch same hot files (e.g. 13.1 + 13.2 + 13.3 all edit `handler.go`).
4. **Check `REVIEWER.md`** — reconcile on main first if "Changes Requested" lock active (same as `/loop` step 3).
5. **REPORT state** (main worktree):
   - `npx gitnexus analyze`
   - `rtk gain`
   - Announce: ✅ `/caveman 1` | ✅ RTK ON | ✅ GitNexus | ✅ `/loopers` × **N** | phases: **13.1, 13.2, …**
6. **Base ref** — `origin/main` (or repo default branch).

### Phase B — Spawn Sub-Agents (parallel)

For each resolved phase (i = 1…N), **in parallel**:

#### B1. Create isolated worktree

```bash
./scripts/loopers-worktree.sh create <i> "<phase_id>" origin/main
```

- Resolves title from `TASKS.md` automatically
- Writes `.opencode/LOOPER_TASK.md` with phase id + worker agent ref
- **Report**: `🆕 Worker-<i> phase <id>` → path + branch

#### B2. Spawn Worker sub-agent

Launch sub-agent with skill + assignment only:

```
@./.opencode/agents/worker.md

Looper ID: <i>
Phase ID: <phase_id>
Worktree: <absolute path>
Branch: looper/<i>-<slug>
Assignment: .opencode/LOOPER_TASK.md
```

Use Task tool: `best-of-n-runner` or `generalPurpose`. Spawn all workers **in parallel**.

**Report**: `🆕 Worker-<i> spawned` → agent id

### Phase C — Orchestrator Monitor

While sub-agents run:

- **Report** periodic status table:

| Worker | Phase | Title | Branch | Status |
|--------|-------|-------|--------|--------|
| 1 | 13.1 | fetchGammaMatchSlugs | looper/1-… | running / PR / merged / failed |

- Do **not** implement code in the main worktree during a `/loopers` run.
- If a sub-agent fails, continue monitoring others — do not abort the batch unless user asks.

### Phase D — Post-Batch Reconciliation (main worktree)

When **all** sub-agents return (success or fail):

1. **Pull merged changes** into main worktree:
   ```bash
   git checkout main && git pull origin main
   ```
2. **Sync TASKS.md** — for each SUCCESS return, verify assigned `[ ]` → `[x]` on main (merge should carry this; if not, reconcile manually).
3. **Report final summary**:

```
## /loopers Batch Complete

| Worker | Phase | PR | Merge | Notes |
|--------|-------|----|-------|-------|
| 1 | 13.1 | url | ✅/❌ | … |

Tokens saved (RTK): …
Next pending task in TASKS.md: …
```

4. **Cleanup worktrees** (only for merged or abandoned agents):
   ```bash
   ./scripts/loopers-worktree.sh remove <i>   # per completed looper
   # OR after full batch:
   ./scripts/loopers-worktree.sh clean-all  # only if all done
   ```
5. **STOP**. Do NOT auto-spawn the next batch. Wait for user to trigger `/loopers` again.

---

## Sub-Agent Contract

Workers are a **subagent skill** (`@./.opencode/agents/worker.md`) — not a command. Hermes passes only the assignment path + worktree context in the spawn prompt. Workers self-load run-loop from `.opencode/commands/loop.md`.

---

## Conflict Policy

| Scenario | Action |
|----------|--------|
| Two tasks edit same file | Warn before spawn; prefer sequential `/loop` instead |
| Merge conflict on PR | Sub-agent fixes in its worktree; re-push; do not merge until green |
| TASKS.md checkbox race | Each sub-agent marks only its own task; orchestrator reconciles on main after batch |
| Sub-agent crash | Log issue via `github-manager.sh issue-create`; mark FAILED in summary |

---

## Behavioral Hard-Enforcement

**Orchestrator:**
`parse` → **report** → validate tasks → **report gitnexus + rtk + caveman** → create N worktrees (**report each**) → spawn N sub-agents (**report each**) → monitor (**report table**) → reconcile main → **report final summary** → cleanup → **STOP**

**Each Worker** (`.opencode/agents/worker.md`):
isolate → resolve phase → **run-loop** → mark `[x]` → return JSON → **STOP**

**Never:**
- Auto-advance to next unassigned task
- Edit main worktree while sub-agents are running
- Spawn >4 concurrent sub-agents
- Skip worktree isolation
