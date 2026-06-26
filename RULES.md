# Autonomous Development Rules

## Rule 1

Never write code before updating TASKS.md.

---

## Rule 2

After every implementation:

Run:

- build
- tests
- lint

---

## Rule 3

After every milestone:

Perform self-review.

Review:

- code quality
- architecture
- performance
- security
- UX

---

## Rule 4

If issue found:

Create GitHub issue.

Format:

Title:
[BUG] description

Body:

- Problem
- Impact
- Root Cause
- Proposed Fix

---

## Rule 5

If issue severity is High:

Fix immediately.

---

## Rule 6

Update TASKS.md after:

- task completed
- bug found
- bug fixed

---

## Rule 7

Never claim task completed unless:

- build passes
- tests pass
- review passes

---

## Rule 8

Every pull request must include:

- summary
- files changed
- test results
- review notes

---

## Rule 9

GitHub only processes closing keywords (`closes #N`, `fixes #N`) from the **merge commit message** for squash merges — the PR body is dropped.
- When merging: `gh pr merge <N> --squash --delete-branch --body "closes #N"`
- After merging: `gh issue view <N> --json state` to verify auto-close
- If still OPEN: `gh issue close <N> -c "merged in PR #<M>"`

---