# World Cup Dashboard MVP

## Goal

Build a local-only MVP dashboard that allows users to:

- View World Cup tournaments
- Filter by year
- Browse matches
- View match details
- Explore a cinematic "Goal Avalanche" timeline of every goal scored

Data source:

https://github.com/openfootball/worldcup.json

Deployment target:

- Local machine only
- Docker Compose only
- No cloud deployment

---

# Engineering Goal

This repository is also used to validate autonomous software development workflows.

The agent must:

- Plan
- Implement
- Test
- Review
- Detect issues
- Create GitHub issues
- Fix issues
- Update documentation

without human intervention whenever possible.

---

# Development Workflow

For every task:

1. Analyze
2. Implement
3. Run tests
4. Run lint
5. Self review
6. Create GitHub Issue if defect found
7. Fix defect
8. Commit

---

# Feature Extensions (Post-MVP)

After MVP completion, the following extensions are planned:

- **Phase 6 — Goal Avalanche Timeline:** A new Go backend endpoint (`/api/v1/goal-avalanche`) that parses worldcup.json to extract every goal into a structured timeline. A React + Tailwind frontend renders a cinematic dark-mode vertical timeline with:
  - Chronological goal cards grouped by match day
  - Expandable detail views (match result, stage, minute track)
  - "Chaos Zone" detection for multiple goals scored simultaneously
  - Intersection Observer scroll animations
  - Sticky progress bar tracking scroll depth

---

# Success Criteria

Functional:

- User can browse all World Cups
- User can filter by year
- User can view match details
- User can explore the Goal Avalanche timeline for any tournament

Engineering:

- CI passes
- Tests pass
- Agent can create GitHub Issues
- Agent can review its own work
