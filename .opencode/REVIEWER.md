# Phase 13 Technical Review — Games Section (Match Slugs + Live Odds)

## Overview

Adding a `GET /api/v1/games` endpoint that queries Polymarket's public Gamma API (`events/keyset` + `events/slug/{slug}`) to serve all 16 World Cup 2026 matches with live moneyline odds. New frontend Games page with glassmorphic match cards.

## Architecture

```
Frontend (Games.tsx)
  └─ fetch /api/v1/games
       └─ HandleGamesList (handler.go)
            ├─ fetchGammaMatchSlugs() → gamma-api /events/keyset?series_id=11433
            └─ for each slug: fetchGammaMatchOdds() → gamma-api /events/slug/{slug}
```

## Code Quality Check

### Strengths ✅
- Uses existing helpers (`parseRawJsonSlice`, `priceToPercent`, `gammaHTTPClient`) — DRY
- No fallback — returns `[]` on error, matching Phase 12 convention
- Pagination handled via `next_cursor` for complete dataset
- Existing test patterns (httptest with mux) already established
- Backend-first approach, consistent with project conventions

### Potential Issues ⚠️

1. **Rate limiting**: `events/slug/{slug}` called per-match (16 calls per request). If users refresh frequently, gamma-api may throttle. Consider adding a short TTL cache (e.g., 30s in-memory or Redis) for the aggregated response.

2. **Pagination cursor**: The `next_cursor` response shape needs confirmation. After the first request returns 15/16 events, the cursor must be followed. If `next_cursor` is empty/absent for the final page, the loop condition must handle both cases.

3. **Gamma API response shape for slug endpoint**: The `events/slug/{slug}` response may return a single event object (not an array). The handler must handle both single-object and array responses.

4. **Binary market selection**: Match slug events have multiple markets (moneyline, spreads, totals). The handler must select the correct binary market for moneyline odds (outcomes = ["Team A", "Team B"]) and skip prop markets.

5. **Frontend type naming**: `GameItem` should be added to `oracle.ts` (reuse existing types file). Consider naming consistency with existing `UpcomingMatch` interface.

6. **Match slug title parsing**: The `events/keyset` endpoint returns titles like "South Africa vs Canada" that may need parsing into `team1`/`team2` separately. The slug encodes the team names already (e.g., `fifwc-rsa-can-2026-06-28`).

## Recommendation

**APPROVED** with the following conditions:
- Add in-memory cache (sync.Map or simple TTL) to avoid >16 Gamma API calls per request
- Handle both single-object and array response from `events/slug/{slug}`
- Select only binary moneyline markets (outcomes.length == 2) for odds extraction
- Parse team names from slug or title for clean display
- Verify `next_cursor` pagination edge cases

No blocking issues. Implementation can proceed.
