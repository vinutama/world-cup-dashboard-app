// Package handler contains HTTP handlers for the World Cup dashboard API.
package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// YearService defines the interface for year-related business logic.
type YearService interface {
	GetAvailableYears(ctx context.Context) ([]int, error)
}

// MatchService defines the interface for match-related business logic.
type MatchService interface {
	GetTournaments(ctx context.Context) ([]*model.Tournament, error)
	GetTournamentsByYear(ctx context.Context, year int) ([]*model.Tournament, error)
	GetMatches(ctx context.Context, year int) ([]model.Match, error)
	GetMatch(ctx context.Context, year, idx int) (*model.Match, error)
	GetGoalAvalanche(ctx context.Context, year int) ([]model.TimelineEvent, error)
}

// Handler groups all HTTP handlers and their dependencies.
type Handler struct {
	yearSvc         YearService
	matchSvc        MatchService
	rdb             *redis.Client
	logger          *slog.Logger
	gamesCache      *gamesCacheData
	standingsCache  *standingsCacheData
}

// gamesCacheData holds a TTL-protected in-memory cache for the games list
// so we don't hammer gamma-api with 15+ requests on every page load.
type gamesCacheData struct {
	mu      sync.Mutex
	data    []GameResponse
	expires time.Time
	ttl     time.Duration
}

// standingsCacheData holds a TTL-protected in-memory cache for the standings.
type standingsCacheData struct {
	mu      sync.Mutex
	data    []GroupStanding
	expires time.Time
	ttl     time.Duration
}

// New creates a new Handler with the given services, Redis client, and logger.
func New(yearSvc YearService, matchSvc MatchService, rdb *redis.Client, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{
		yearSvc:  yearSvc,
		matchSvc: matchSvc,
		rdb:      rdb,
		logger:   logger,
		gamesCache: &gamesCacheData{
			ttl: 30 * time.Second,
		},
		standingsCache: &standingsCacheData{
			ttl: 60 * time.Second,
		},
	}
}

// RegisterRoutes registers all API routes on the given mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("GET /api/years", h.GetYears)
	mux.HandleFunc("GET /api/tournaments", h.GetTournaments)
	mux.HandleFunc("GET /api/tournaments/{id}", h.GetTournament)
	mux.HandleFunc("GET /api/tournaments/{id}/matches", h.GetTournamentMatches)
	mux.HandleFunc("GET /api/matches/{id}", h.GetMatch)
	mux.HandleFunc("GET /api/v1/goal-avalanche", h.GetGoalAvalanche)
	mux.HandleFunc("GET /api/v1/predictions/global", h.GetGlobalLeaderboard)
	mux.HandleFunc("GET /api/v1/predictions/match/next", h.GetNextMatchOracle)
	mux.HandleFunc("GET /api/v1/games", h.GetGamesList)
	mux.HandleFunc("GET /api/v1/standings", h.GetStandings)
}

// Health responds with service status.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetYears returns all available World Cup years.
func (h *Handler) GetYears(w http.ResponseWriter, r *http.Request) {
	years, err := h.yearSvc.GetAvailableYears(r.Context())
	if err != nil {
		h.logger.Error("failed to get years", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch available years")
		return
	}
	writeJSON(w, http.StatusOK, years)
}

// GetTournaments returns all tournaments, optionally filtered by ?year=.
func (h *Handler) GetTournaments(w http.ResponseWriter, r *http.Request) {
	yearFilter := r.URL.Query().Get("year")

	if yearFilter != "" {
		year, err := strconv.Atoi(yearFilter)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid year parameter")
			return
		}
		tournaments, err := h.matchSvc.GetTournamentsByYear(r.Context(), year)
		if err != nil {
			h.logger.Error("failed to get tournaments by year", "year", year, "error", err)
			writeError(w, http.StatusInternalServerError, "failed to fetch tournaments")
			return
		}
		if len(tournaments) == 0 {
			writeJSON(w, http.StatusOK, []interface{}{})
			return
		}
		writeJSON(w, http.StatusOK, tournaments)
		return
	}

	tournaments, err := h.matchSvc.GetTournaments(r.Context())
	if err != nil {
		h.logger.Error("failed to get tournaments", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch tournaments")
		return
	}

	// Sort by year descending (most recent first)
	sort.Slice(tournaments, func(i, j int) bool {
		return tournaments[i].Year > tournaments[j].Year
	})

	writeJSON(w, http.StatusOK, tournaments)
}

// GetTournament returns a single tournament by year.
func (h *Handler) GetTournament(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	year, err := strconv.Atoi(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tournament id — must be a year")
		return
	}

	tournaments, err := h.matchSvc.GetTournamentsByYear(r.Context(), year)
	if err != nil {
		h.logger.Error("failed to get tournament", "id", id, "error", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch tournament")
		return
	}
	if len(tournaments) == 0 {
		writeError(w, http.StatusNotFound, "tournament not found")
		return
	}
	writeJSON(w, http.StatusOK, tournaments[0])
}

// matchResponse pairs a match with its position in the sorted full match array.
// The original_index is the 0-based index in the sorted array, used by the frontend
// to construct correct match detail links (e.g. /matches/2018-5).
type matchResponse struct {
	Match         model.Match `json:"match"`
	OriginalIndex int         `json:"original_index"`
}

// GetTournamentMatches returns paginated matches for a tournament.
// Supports ?sort=asc|desc to control sort order (default asc).
func (h *Handler) GetTournamentMatches(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	year, err := strconv.Atoi(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tournament id — must be a year")
		return
	}

	page, perPage := parsePaginationParams(r)
	sortOrder := r.URL.Query().Get("sort")

	allMatches, err := h.matchSvc.GetMatches(r.Context(), year)
	if err != nil {
		h.logger.Error("failed to get matches", "year", year, "error", err)
		writeError(w, http.StatusNotFound, "tournament not found")
		return
	}

	// Sort by date — allMatches is already sorted ascending from the cache,
	// so we only need to reverse for descending order.
	// IMPORTANT: copy the slice before mutating to avoid corrupting the cache.
	if sortOrder == "desc" {
		sorted := make([]model.Match, len(allMatches))
		copy(sorted, allMatches)
		for i, j := 0, len(sorted)-1; i < j; i, j = i+1, j-1 {
			sorted[i], sorted[j] = sorted[j], sorted[i]
		}
		allMatches = sorted
	}

	// Apply optional case-insensitive search/filter by nation (team name).
	// Preserve the original index from the FULL match array so match detail links
	// (e.g. /matches/2018-5) resolve correctly regardless of filtering.
	type matchWithOrigIdx struct {
		match   model.Match
		origIdx int
	}

	srcMatches := make([]matchWithOrigIdx, 0, len(allMatches))
	if q := strings.TrimSpace(r.URL.Query().Get("q")); q != "" {
		qLower := strings.ToLower(q)
		for i, m := range allMatches {
			if strings.Contains(strings.ToLower(m.Team1), qLower) ||
				strings.Contains(strings.ToLower(m.Team2), qLower) {
				srcMatches = append(srcMatches, matchWithOrigIdx{match: m, origIdx: i})
			}
		}
	} else {
		for i, m := range allMatches {
			srcMatches = append(srcMatches, matchWithOrigIdx{match: m, origIdx: i})
		}
	}

	total := len(srcMatches)
	totalPages := (total + perPage - 1) / perPage
	if totalPages == 0 {
		totalPages = 1
	}

	// Clamp page to valid range
	if page < 1 {
		page = 1
	}
	if page > totalPages {
		page = totalPages
	}

	// Slice the matches for the requested page
	start := (page - 1) * perPage
	end := start + perPage
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	// Build the response with original_index for each match
	// original_index always refers to the match's position in the ASCENDING array
	// so match detail links work regardless of sort order.
	// When ?q= filtering is active, original_index comes from the preserved
	// unfiltered array position (srcMatches[*].origIdx).
	matches := make([]matchResponse, 0, end-start)
	for _, mwi := range srcMatches[start:end] {
		originalIndex := mwi.origIdx
		if sortOrder == "desc" {
			originalIndex = len(allMatches) - 1 - originalIndex
		}
		matches = append(matches, matchResponse{
			Match:         mwi.match,
			OriginalIndex: originalIndex,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"matches":     matches,
		"page":        page,
		"per_page":    perPage,
		"total":       total,
		"total_pages": totalPages,
	})
	}

// parsePaginationParams extracts and validates page & per_page from query params.
func parsePaginationParams(r *http.Request) (page, perPage int) {
	page = 1
	perPage = 10

	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if pp := r.URL.Query().Get("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 100 {
			perPage = v
		}
	}
	return
}

// GetMatch returns a single match by composite ID "year-index" (e.g., "2018-5").
func (h *Handler) GetMatch(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	parts := strings.SplitN(id, "-", 2)
	if len(parts) != 2 {
		writeError(w, http.StatusBadRequest, "invalid match id — expected format: {year}-{index}")
		return
	}

	year, err := strconv.Atoi(parts[0])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid match id — year must be numeric")
		return
	}

	idx, err := strconv.Atoi(parts[1])
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid match id — index must be numeric")
		return
	}

	match, err := h.matchSvc.GetMatch(r.Context(), year, idx)
	if err != nil {
		h.logger.Error("failed to get match", "id", id, "error", err)
		writeError(w, http.StatusNotFound, "match not found")
		return
	}
	writeJSON(w, http.StatusOK, match)
}

// GetGoalAvalanche returns a sorted timeline of all goal events for a year.
func (h *Handler) GetGoalAvalanche(w http.ResponseWriter, r *http.Request) {
	yearStr := r.URL.Query().Get("year")
	if yearStr == "" {
		writeError(w, http.StatusBadRequest, "missing required query parameter: year")
		return
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "year must be a number")
		return
	}

	events, err := h.matchSvc.GetGoalAvalanche(r.Context(), year)
	if err != nil {
		h.logger.Error("failed to get goal avalanche", "year", year, "error", err)
		writeError(w, http.StatusNotFound, "tournament not found")
		return
	}

	// Group by match day so the frontend receives a clean, categorized structure.
	timeline := make(map[int][]model.TimelineEvent)
	for _, e := range events {
		timeline[e.MatchDay] = append(timeline[e.MatchDay], e)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"timeline": timeline,
	})
}

// GlobalLeaderboardResponse represents a single entry in the prediction leaderboard.
type GlobalLeaderboardResponse struct {
	Team        string `json:"team"`
	Probability int    `json:"probability"`
}

// TopLeaderboardTeams is the maximum number of teams to return.
const TopLeaderboardTeams = 10

// GetGlobalLeaderboard returns the top-10 World Cup winner predictions from Polymarket.
// No fallback — when gamma-api is unreachable, returns error with empty array.
func (h *Handler) GetGlobalLeaderboard(w http.ResponseWriter, r *http.Request) {
	teamMarkets, err := h.fetchPolymarketTeams(r.Context())
	if err != nil {
		h.logger.Warn("failed to fetch Polymarket leaderboard (no fallback)", "error", err)
		writeJSON(w, http.StatusOK, []GlobalLeaderboardResponse{})
		return
	}

	top10 := make([]GlobalLeaderboardResponse, 0, TopLeaderboardTeams)
	for i := 0; i < len(teamMarkets) && i < TopLeaderboardTeams; i++ {
		top10 = append(top10, teamMarkets[i])
	}

	writeJSON(w, http.StatusOK, top10)
}

// fetchPolymarketTeams queries the Polymarket gamma-api for all World Cup winner markets
// via /markets?active=true&limit=200. Extracts team names and "Yes" probabilities,
// returns sorted descending by probability.
func (h *Handler) fetchPolymarketTeams(ctx context.Context) ([]GlobalLeaderboardResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://gamma-api.polymarket.com/markets?active=true&limit=200", nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("User-Agent", "WorldCupDashboard/1.0")

	client := gammaHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling polymarket api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var markets []struct {
		Question      string          `json:"question"`
		OutcomePrices json.RawMessage `json:"outcomePrices"`
		Event         string          `json:"event"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&markets); err != nil {
		return nil, fmt.Errorf("decoding polymarket response: %w", err)
	}

	var results []GlobalLeaderboardResponse
	for _, m := range markets {
		// Only World Cup markets
		if !strings.Contains(m.Question, "World Cup") && !strings.Contains(m.Event, "World Cup") {
			continue
		}
		team := parseWorldCupTeam(m.Question)
		if team == "" {
			continue
		}

		// Safely handle both double-encoded strings "[\"0.18\"]" AND native arrays ["0.18"]
		prices := parseRawJsonSlice(m.OutcomePrices)
		if len(prices) == 0 {
			continue
		}

		prob := priceToPercent(prices[0])
		if prob == 0 {
			continue
		}

		results = append(results, GlobalLeaderboardResponse{
			Team:        team,
			Probability: prob,
		})
	}

	if len(results) == 0 {
		return nil, errors.New("successfully hit API but parsed 0 valid soccer nations")
	}

	// Sort descending by win probability
	sort.Slice(results, func(i, j int) bool {
		return results[i].Probability > results[j].Probability
	})

	return results, nil
}

// parseWorldCupTeam extracts the team name from a Polymarket question like
// "Will France win the 2026 FIFA World Cup?" or returns empty string if no match.
func parseWorldCupTeam(question string) string {
	const prefix = "Will "
	const suffix = " win the 2026 FIFA World Cup?"
	if len(question) < len(prefix)+len(suffix) {
		return ""
	}
	if !strings.HasPrefix(question, prefix) || !strings.HasSuffix(question, suffix) {
		return ""
	}
	return question[len(prefix) : len(question)-len(suffix)]
}

// --- Match Oracle ---

// UpcomingMatchResponse is a single upcoming match prediction with 3-way odds
// (home/draw/away) fetched purely from Polymarket gamma-api events.
type UpcomingMatchResponse struct {
	Match       string `json:"match"`
	EndDate     string `json:"endDate"`
	Venue       string `json:"venue"`
	PercentHome int    `json:"percentHome"`
	PercentDraw int    `json:"percentDraw"`
	PercentAway int    `json:"percentAway"`
	Source      string `json:"source"`
}

// GetNextMatchOracle returns up to 10 live upcoming match predictions fetched
// purely from Polymarket gamma-api events. No fallback — returns [] on error.
func (h *Handler) GetNextMatchOracle(w http.ResponseWriter, r *http.Request) {
	matches, err := h.fetchPureMatchOracle(r.Context())
	if err != nil {
		h.logger.Warn("failed to fetch live match odds from Polymarket", "error", err)
		writeJSON(w, http.StatusOK, []UpcomingMatchResponse{})
		return
	}

	// Limit to the top 10 closest upcoming matches
	if len(matches) > 10 {
		matches = matches[:10]
	}

	writeJSON(w, http.StatusOK, matches)
}

// fetchPureMatchOracle queries the public Polymarket Gamma API for active match events,
// parses their 3-way or binary betting lines, and returns them sorted chronologically.
func (h *Handler) fetchPureMatchOracle(ctx context.Context) ([]UpcomingMatchResponse, error) {
	// Query active, open events across the platform
	endpoint := "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("User-Agent", "WorldCupDashboard/1.0")

	client := gammaHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling polymarket api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code from polymarket: %d", resp.StatusCode)
	}

	type GammaEvent struct {
		Title   string `json:"title"`
		EndDate string `json:"endDate"`
		Markets []struct {
			Outcomes      json.RawMessage `json:"outcomes"`
			OutcomePrices json.RawMessage `json:"outcomePrices"`
		} `json:"markets"`
	}

	var events []GammaEvent
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		return nil, fmt.Errorf("decoding polymarket response: %w", err)
	}

	results := make([]UpcomingMatchResponse, 0)

	for _, event := range events {
		// Filter for soccer/World Cup match items
		titleLower := strings.ToLower(event.Title)
		if !strings.Contains(titleLower, "vs") || (!strings.Contains(titleLower, "cup") && !strings.Contains(titleLower, "match")) {
			continue
		}

		if len(event.Markets) == 0 {
			continue
		}

		// Look at the primary match market (usually the first market listed in the event)
		market := event.Markets[0]

		// Parse outcomes and prices safely
		outcomes := parseRawJsonSlice(market.Outcomes)
		prices := parseRawJsonSlice(market.OutcomePrices)

		if len(outcomes) == 0 || len(prices) == 0 || len(outcomes) != len(prices) {
			continue
		}

		var homeWin, draw, awayWin int

		// Format A: 3-Way Market -> ["Team A", "Draw", "Team B"]
		if len(outcomes) == 3 {
			homeWin = priceToPercent(prices[0])
			draw = priceToPercent(prices[1])
			awayWin = priceToPercent(prices[2])
		} else if len(outcomes) == 2 {
			// Format B: Binary Head-to-Head -> ["Team A", "Team B"]
			homeWin = priceToPercent(prices[0])
			draw = 0
			awayWin = priceToPercent(prices[1])
		} else {
			continue
		}

		results = append(results, UpcomingMatchResponse{
			Match:       event.Title,
			EndDate:     event.EndDate,
			Venue:       "FIFA 2026 Venue", // Polymarket doesn't supply stadiums
			PercentHome: homeWin,
			PercentDraw: draw,
			PercentAway: awayWin,
			Source:      "Polymarket Live Multi-Outcome Line",
		})
	}

	// Sort matches chronologically so the closest game appears first on the dashboard
	sort.Slice(results, func(i, j int) bool {
		tI, errI := time.Parse(time.RFC3339, results[i].EndDate)
		tJ, errJ := time.Parse(time.RFC3339, results[j].EndDate)
		if errI != nil || errJ != nil {
			return false
		}
		return tI.Before(tJ)
	})

	return results, nil
}

// gammaHTTPClient returns an HTTP client that resolves gamma-api.polymarket.com
// via a custom dialer. If system DNS fails (common inside Docker), it falls back
// to a known Cloudflare IP for gamma-api.
func gammaHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				if strings.Contains(addr, "gamma-api.polymarket.com:443") {
					// Try system DNS first (works via extra_hosts in Docker, or native macOS)
					ips, err := net.DefaultResolver.LookupHost(ctx, "gamma-api.polymarket.com")
					if err == nil && len(ips) > 0 {
						addr = ips[0] + ":443"
					} else {
						// Fallback to known IP (Cloudflare proxy)
						addr = "172.64.153.51:443"
					}
				}
				return (&net.Dialer{Timeout: 5 * time.Second}).DialContext(ctx, network, addr)
			},
		},
	}
}

// --- Games List (Gamma API) ---

// GameResponse is the full response item for a single World Cup match.
type GameResponse struct {
	Slug        string  `json:"slug"`
	Team1       string  `json:"team1"`
	Team2       string  `json:"team2"`
	Date        string  `json:"date"`
	PercentHome int     `json:"percentHome"`
	PercentDraw int     `json:"percentDraw"`
	PercentAway int     `json:"percentAway"`
	Volume      float64 `json:"volume"`
	Source      string  `json:"source"`
}

// slugTeamRegexp parses team codes from slug: fifwc-{teamA}-{teamB}-{YYYY-MM-DD}
var slugTeamRegexp = regexp.MustCompile(`^fifwc-([a-z]+)-([a-z]+)-\d{4}-\d{2}-\d{2}$`)

// isoCodeToName maps Gamma 3-letter country codes to display names.
var isoCodeToName = map[string]string{
	"rsa": "South Africa", "can": "Canada", "bra": "Brazil", "jpn": "Japan",
	"ger": "Germany", "par": "Paraguay", "nld": "Netherlands", "mar": "Morocco",
	"civ": "Côte d'Ivoire", "nor": "Norway", "fra": "France", "swe": "Sweden",
	"mex": "Mexico", "ecu": "Ecuador", "eng": "England", "cdr": "DR Congo",
	"bel": "Belgium", "sen": "Senegal", "usa": "USA", "bih": "Bosnia and Herzegovina",
	"esp": "Spain", "aut": "Austria", "prt": "Portugal", "hrv": "Croatia",
	"che": "Switzerland", "alg": "Algeria", "aus": "Australia", "egy": "Egypt",
	"arg": "Argentina", "cvi": "Cabo Verde", "col": "Colombia", "gha": "Ghana",
}

// GetGamesList returns all available World Cup 2026 matches with live Polymarket odds.
// Uses an in-memory cache with 30s TTL to avoid excessive Gamma API calls.
func (h *Handler) GetGamesList(w http.ResponseWriter, r *http.Request) {
	// Check in-memory cache first
	if h.gamesCache != nil {
		h.gamesCache.mu.Lock()
		if !h.gamesCache.expires.IsZero() && time.Now().Before(h.gamesCache.expires) {
			data := h.gamesCache.data
			h.gamesCache.mu.Unlock()
			writeJSON(w, http.StatusOK, data)
			return
		}
		h.gamesCache.mu.Unlock()
	}

	// Cache miss — fetch fresh data
	slugs, err := h.fetchGammaMatchSlugs(r.Context())
	if err != nil {
		h.logger.Warn("failed to fetch Gamma match slugs (no fallback)", "error", err)
		writeJSON(w, http.StatusOK, []GameResponse{})
		return
	}

	if len(slugs) == 0 {
		writeJSON(w, http.StatusOK, []GameResponse{})
		return
	}

	// Fetch odds for each slug concurrently
	type slugResult struct {
		slug string
		odds *GameResponse
	}
	ch := make(chan slugResult, len(slugs))
	ctx := r.Context()

	for _, slug := range slugs {
		s := slug
		go func() {
			odds, err := h.fetchGammaGame(ctx, s)
			if err != nil {
				h.logger.Warn("failed to fetch Gamma game odds", "slug", s, "error", err)
				ch <- slugResult{slug: s, odds: nil}
				return
			}
			ch <- slugResult{slug: s, odds: odds}
		}()
	}

	results := make([]GameResponse, 0, len(slugs))
	for i := 0; i < len(slugs); i++ {
		res := <-ch
		if res.odds != nil {
			results = append(results, *res.odds)
		}
	}

	// Sort chronologically by date
	sort.Slice(results, func(i, j int) bool {
		return results[i].Date < results[j].Date
	})

	// Cache the result
	if h.gamesCache != nil {
		h.gamesCache.mu.Lock()
		h.gamesCache.data = results
		h.gamesCache.expires = time.Now().Add(h.gamesCache.ttl)
		h.gamesCache.mu.Unlock()
	}

	writeJSON(w, http.StatusOK, results)
}

// fetchGammaMatchSlugs queries events/keyset for all root WC 2026 match slugs.
// Filters for events with no parentEventId (root match events, not props).
func (h *Handler) fetchGammaMatchSlugs(ctx context.Context) ([]string, error) {
	endpoint := "https://gamma-api.polymarket.com/events/keyset?closed=false&limit=100&series_id=11433"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating keyset request: %w", err)
	}
	req.Header.Set("User-Agent", "WorldCupDashboard/1.0")

	client := gammaHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling gamma-api keyset: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gamma-api keyset status: %d", resp.StatusCode)
	}

	var keysetResp struct {
		Events []struct {
			Slug          string `json:"slug"`
			ParentEventID *int   `json:"parentEventId"`
		} `json:"events"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&keysetResp); err != nil {
		return nil, fmt.Errorf("decoding keyset response: %w", err)
	}

	// Collect root-level match slugs (no parentEventId)
	seen := make(map[string]bool)
	var slugs []string
	for _, e := range keysetResp.Events {
		if e.ParentEventID == nil && !seen[e.Slug] && strings.Contains(e.Slug, "fifwc-") && !strings.Contains(e.Slug, "-player-props") {
			seen[e.Slug] = true
			slugs = append(slugs, e.Slug)
		}
	}

	if len(slugs) == 0 {
		return nil, errors.New("found 0 root match slugs in keyset response")
	}

	return slugs, nil
}

// fetchGammaGame fetches odds for a single match slug from events/slug/{slug}.
// The response is a single event object (not array) containing binary markets
// for each possible outcome (Team A win, Team B win, Draw).
func (h *Handler) fetchGammaGame(ctx context.Context, slug string) (*GameResponse, error) {
	endpoint := fmt.Sprintf("https://gamma-api.polymarket.com/events/slug/%s", slug)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("creating slug request: %w", err)
	}
	req.Header.Set("User-Agent", "WorldCupDashboard/1.0")

	client := gammaHTTPClient()
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling gamma-api slug: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gamma-api slug %q status: %d", slug, resp.StatusCode)
	}

	var event struct {
		Title   string `json:"title"`
		EndDate string `json:"endDate"`
		Markets []struct {
			Question      string          `json:"question"`
			OutcomePrices json.RawMessage `json:"outcomePrices"`
			Volume        json.RawMessage `json:"volume"`
		} `json:"markets"`
		Teams []struct {
			Name      string `json:"name"`
			Ordering  string `json:"ordering"` // "home" or "away"
		} `json:"teams"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&event); err != nil {
		return nil, fmt.Errorf("decoding slug response: %w", err)
	}

	// Parse team names from the teams array
	var team1, team2 string
	for _, t := range event.Teams {
		if t.Ordering == "home" {
			team1 = t.Name
		} else if t.Ordering == "away" {
			team2 = t.Name
		}
	}

	// Parse date from endDate
	date := event.EndDate
	if parsed, err := time.Parse(time.RFC3339, date); err == nil {
		date = parsed.Format("2006-01-02")
	}

	// Extract moneyline odds from the three binary markets
	// Market format: "Will {Team} win...", "Will ... end in a draw"
	var percentHome, percentDraw, percentAway int
	var totalVol float64

	for _, m := range event.Markets {
		prices := parseRawJsonSlice(m.OutcomePrices)
		if len(prices) < 2 {
			continue
		}
		q := strings.ToLower(m.Question)

		// Draw market
		if strings.Contains(q, "end in a draw") {
			percentDraw = priceToPercent(prices[0])
			continue
		}

		// Win market — match by team name
		if strings.Contains(q, "win") {
			if team1 != "" && strings.Contains(q, strings.ToLower(team1)) {
				percentHome = priceToPercent(prices[0])
			} else if team2 != "" && strings.Contains(q, strings.ToLower(team2)) {
				percentAway = priceToPercent(prices[0])
			}
		}
	}

	// Calculate volume as sum of all market volumes
	for _, m := range event.Markets {
		totalVol += parseVolume(m.Volume)
	}

	game := &GameResponse{
		Slug:        slug,
		Team1:       team1,
		Team2:       team2,
		Date:        date,
		PercentHome: percentHome,
		PercentDraw: percentDraw,
		PercentAway: percentAway,
		Volume:      totalVol,
		Source:      "Polymarket Match Odds",
	}

	return game, nil
}

// parseRawJsonSlice safely handles double-encoded JSON arrays ("[\"A\",\"B\"]") or
// normal arrays (["A","B"]) and returns a string slice.
func parseRawJsonSlice(raw json.RawMessage) []string {
	var result []string
	cleanRaw := bytes.TrimSpace(raw)
	if len(cleanRaw) == 0 {
		return nil
	}

	if cleanRaw[0] == '"' {
		var unescapedString string
		if err := json.Unmarshal(cleanRaw, &unescapedString); err == nil {
			_ = json.Unmarshal([]byte(unescapedString), &result)
		}
	} else {
		_ = json.Unmarshal(cleanRaw, &result)
	}
	return result
}

// priceToPercent converts a fractional price string ("0.425") to an integer percentage (43).
func priceToPercent(priceStr string) int {
	val, err := strconv.ParseFloat(priceStr, 64)
	if err != nil {
		return 0
	}
	return int((val * 100) + 0.5)
}

// parseVolume parses a volume field that may be a float64 or string in JSON.
func parseVolume(raw json.RawMessage) float64 {
	if len(raw) == 0 {
		return 0
	}
	// Try direct float64
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return f
	}
	// Try string
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return f
}

// writeJSON sends a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeError sends a JSON error response.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// --- Standings (ESPN API) ---

// TeamStanding represents a single team's row in a group standings table.
type TeamStanding struct {
	TeamName     string `json:"teamName"`
	Played       int    `json:"played"`
	Wins         int    `json:"wins"`
	Draws        int    `json:"draws"`
	Losses       int    `json:"losses"`
	GoalsFor     int    `json:"goalsFor"`
	GoalsAgainst int    `json:"goalsAgainst"`
	GoalDiff     int    `json:"goalDiff"`
	Points       int    `json:"points"`
}

// GroupStanding represents one group with its teams sorted by points.
type GroupStanding struct {
	Group string         `json:"group"`
	Teams []TeamStanding `json:"teams"`
}

// GetStandings returns the current World Cup group standings.
func (h *Handler) GetStandings(w http.ResponseWriter, r *http.Request) {
	h.standingsCache.mu.Lock()
	if time.Now().Before(h.standingsCache.expires) {
		data := h.standingsCache.data
		h.standingsCache.mu.Unlock()
		writeJSON(w, http.StatusOK, data)
		return
	}
	h.standingsCache.mu.Unlock()

	standings, err := h.fetchStandings()
	if err != nil {
		h.logger.Error("failed to fetch standings", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to fetch standings")
		return
	}

	h.standingsCache.mu.Lock()
	h.standingsCache.data = standings
	h.standingsCache.expires = time.Now().Add(h.standingsCache.ttl)
	h.standingsCache.mu.Unlock()

	writeJSON(w, http.StatusOK, standings)
}

// fetchStandings fetches match results from the openfootball GitHub repo
// and computes group standings from actual match scores.
func (h *Handler) fetchStandings() ([]GroupStanding, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json")
	if err != nil {
		return nil, fmt.Errorf("openfootball request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openfootball read: %w", err)
	}

	var data struct {
		Name    string `json:"name"`
		Matches []struct {
			Team1 string          `json:"team1"`
			Team2 string          `json:"team2"`
			Score json.RawMessage `json:"score"`
			Group string          `json:"group"`
		} `json:"matches"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("openfootball parse: %w", err)
	}

	// group → team → stats
	type teamStats struct {
		played       int
		wins, draws, losses int
		goalsFor, goalsAgainst int
		points       int
	}
	groupsMap := make(map[string]map[string]*teamStats)
	groupOrder := []string{}

	for _, m := range data.Matches {
		if m.Group == "" {
			continue
		}
		g := m.Group
		if groupsMap[g] == nil {
			groupsMap[g] = make(map[string]*teamStats)
			groupOrder = append(groupOrder, g)
		}
		for _, name := range []string{m.Team1, m.Team2} {
			if groupsMap[g][name] == nil {
				groupsMap[g][name] = &teamStats{}
			}
		}

		// Parse score
		var score struct {
			Ft []int `json:"ft"`
		}
		if err := json.Unmarshal(m.Score, &score); err != nil || len(score.Ft) < 2 {
			continue // match not played yet or no score
		}
		g1, g2 := score.Ft[0], score.Ft[1]

		t1 := groupsMap[g][m.Team1]
		t2 := groupsMap[g][m.Team2]
		t1.played++
		t2.played++
		t1.goalsFor += g1
		t1.goalsAgainst += g2
		t2.goalsFor += g2
		t2.goalsAgainst += g1

		switch {
		case g1 > g2:
			t1.wins++
			t2.losses++
			t1.points += 3
		case g1 < g2:
			t2.wins++
			t1.losses++
			t2.points += 3
		default:
			t1.draws++
			t2.draws++
			t1.points++
			t2.points++
		}
	}

	var groups []GroupStanding
	for _, gName := range groupOrder {
		teamMap := groupsMap[gName]
		var teams []TeamStanding
		for name, st := range teamMap {
			teams = append(teams, TeamStanding{
				TeamName:     name,
				Played:       st.played,
				Wins:         st.wins,
				Draws:        st.draws,
				Losses:       st.losses,
				GoalsFor:     st.goalsFor,
				GoalsAgainst: st.goalsAgainst,
				GoalDiff:     st.goalsFor - st.goalsAgainst,
				Points:       st.points,
			})
		}
		// Sort by points (desc), then goal diff (desc), then goals for (desc)
		sort.Slice(teams, func(i, j int) bool {
			if teams[i].Points != teams[j].Points {
				return teams[i].Points > teams[j].Points
			}
			if teams[i].GoalDiff != teams[j].GoalDiff {
				return teams[i].GoalDiff > teams[j].GoalDiff
			}
			return teams[i].GoalsFor > teams[j].GoalsFor
		})
		groups = append(groups, GroupStanding{
			Group: gName,
			Teams: teams,
		})
	}

	if groups == nil {
		return []GroupStanding{}, nil
	}
	return groups, nil
}
