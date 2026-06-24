# LOOP.md — Autonomous Engineering Protocol

For every milestone, execute strictly in this order:

```text
PLAN
  ↓
IMPLEMENT
  ↓
BUILD
  ↓
TEST
  ↓
REVIEW
  ↓
CREATE ISSUES    ➔  Execute: ./scripts/github-manager.sh issue-create "<Title>" "<Body>"
  ↓
FIX ISSUES
  ↓
RETEST
  ↓
CLOSE ISSUES     ➔  Execute: ./scripts/github-manager.sh issue-close <issue_number>
  ↓
UPDATE DOCS
  ↓
COMMIT & PUSH    ➔  Execute: ./scripts/github-manager.sh commit "<Milestone summary>"
  ↓
NEXT TASK