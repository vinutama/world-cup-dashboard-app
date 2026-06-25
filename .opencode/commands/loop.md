# Command: /loop
# Alias: //loop
# Alias: run-loop

## Prerequisites (run before loop starts)
- Agent: load @./skills/caveman/SKILL.md (terse mode — saves ~65% response tokens)
- Token economy: **RTK** (Rust Token Killer) active — all shell commands routed through `rtk` proxy
- Code Intel: run `npx gitnexus analyze` after checkout to index the repo
- **REPORT**: announce all 3 tools running before & after every change — user must see proof

## Directive Expansion:
[SYSTEM OVERRIDE: AUTOMATIC PROTOCOL LOOP.md ENGAGED]

1. **Token economy first**: `/caveman 1` ON — terse responses, no fluff, code/commits stay normal.
2. Parse `TASKS.md`. Locate the first pending `[ ]` task in the tree.
3. Check `REVIEWER.md`. If it holds an active "Changes Requested" lock:
   - Reconcile all requested changes into `TASKS.md` immediately.
   - Update status to `APPROVED`.
   - Execute `./scripts/github-manager.sh commit "Reconciled TASKS.md against Reviewer notes"`.
4. **Before any implementation — REPORT state:**
   - Run `npx gitnexus analyze` — show re-index result to user.
   - Run `rtk gain` — show token savings summary to user.
   - Announce: ✅ `/caveman 1` active | ✅ RTK proxy ON | ✅ GitNexus indexed.
5. Target the identified pending task and force it through the pipeline with **explicit reporting at every step**:
   - **🆕 Report**: "Creating issue..." → create issue → show URL to user
   - **🆕 Report**: "Creating branch..." → create branch → show branch name to user
   - **🆕 Report**: "Running gitnexus..." → `npx gitnexus analyze` (report) → implement (via `rtk`) → build → test → commit → push
   - **🆕 Report**: "Running gitnexus..." → `npx gitnexus analyze` (report) → create PR → show PR URL to user
   - **🆕 Report**: "Reviewing PR..." → `gh pr review --approve` or review changes → report result
   - **🆕 Report**: "Merging..." → merge → report merge result
6. If any stage fails, capture the stderr, execute `./scripts/github-manager.sh issue-create`, and enter the `FIX ISSUES` sub-loop.
7. Upon 100% Stage Success:
   - Mark the task as completed `[x]` in `TASKS.md`.
   - Execute `./scripts/github-manager.sh commit "Completed: [Task Name]"`.
   - **REPORT final cycle summary** — what ran, tokens saved, next step waiting.
   - **STOP**. Do NOT auto-advance to the next task. Wait for the user to trigger the next cycle manually.

**Behavioral Hard-Enforcement:**
Each task cycle: **report** → create issue → **report** → create branch → **report gitnexus + rtk gain + caveman** → fix code (via `rtk`) → add commit → push → **report gitnexus** → create PR → **report PR URL** → review → **report review result** → merge → **report merge result**. **After merge, STOP.** Caveman mode active every response — only fluff die. Technical substance stay. RTK proxy all shell commands for token compression. **Every step gets a report to user.** Do NOT auto-advance.