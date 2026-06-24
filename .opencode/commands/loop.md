# Command: /loop
# Alias: //loop
# Alias: run-loop

## Directive Expansion:
[SYSTEM OVERRIDE: AUTOMATIC PROTOCOL LOOP.md ENGAGED]

1. Parse `TASKS.md`. Locate the first pending `[ ]` task in the tree.
2. Check `REVIEWER.md`. If it holds an active "Changes Requested" lock:
   - Reconcile all requested changes into `TASKS.md` immediately.
   - Update status to `APPROVED`.
   - Execute `./scripts/github-manager.sh commit "Reconciled TASKS.md against Reviewer notes"`.
3. Target the identified pending task and force it through the `LOOP.md` pipeline:
   PLAN ➔ IMPLEMENT ➔ BUILD ➔ TEST ➔ REVIEW
4. If any stage fails, capture the stderr, execute `./scripts/github-manager.sh issue-create`, and enter the `FIX ISSUES` sub-loop.
5. Upon 100% Stage Success:
   - Mark the task as completed `[x]` in `TASKS.md`.
   - Execute `./scripts/github-manager.sh commit "Completed: [Task Name]"`.
   - Instantly acquire the next pending `[ ]` task and re-trigger the pipeline.

**Behavioral Hard-Enforcement:**
Do NOT ask the user for permission to move to the next task. Continue autonomous traversal of `TASKS.md` until an entire Phase milestone is reached, or an unresolvable bash panic occurs. Maintain extreme Caveman syntax.