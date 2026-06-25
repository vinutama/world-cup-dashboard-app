# Command: /loop
# Alias: //loop
# Alias: run-loop

## Prerequisites (run before loop starts)
- Agent: load @./skills/caveman/SKILL.md (terse mode — saves ~65% response tokens)
- Tooling: use **mise** (rtx successor) for runtime/tool management
- Code Intel: run `npx gitnexus analyze` after checkout to index the repo

## Directive Expansion:
[SYSTEM OVERRIDE: AUTOMATIC PROTOCOL LOOP.md ENGAGED]

1. **Token economy first**: caveman mode ON — terse responses, no fluff, code/commits stay normal.
2. Parse `TASKS.md`. Locate the first pending `[ ]` task in the tree.
3. Check `REVIEWER.md`. If it holds an active "Changes Requested" lock:
   - Reconcile all requested changes into `TASKS.md` immediately.
   - Update status to `APPROVED`.
   - Execute `./scripts/github-manager.sh commit "Reconciled TASKS.md against Reviewer notes"`.
4. Target the identified pending task and force it through the pipeline:
   **create issue → create branch → `npx gitnexus analyze` → implement → build → test → commit → push → create PR → review → if OK merge.**
5. If any stage fails, capture the stderr, execute `./scripts/github-manager.sh issue-create`, and enter the `FIX ISSUES` sub-loop.
6. Upon 100% Stage Success:
   - Mark the task as completed `[x]` in `TASKS.md`.
   - Execute `./scripts/github-manager.sh commit "Completed: [Task Name]"`.
   - **STOP**. Do NOT auto-advance to the next task. Wait for the user to trigger the next cycle manually.

**Behavioral Hard-Enforcement:**
Each task cycle: create issue → create branch → `npx gitnexus analyze` → fix code → add commit → push → create PR → review → merge. **After merge, STOP.** Caveman mode active every response — only fluff die. Technical substance stay. Use mise (not raw npm/brew) where possible. Do NOT auto-advance.