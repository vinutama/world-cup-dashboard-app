// Package handler contains HTTP handlers for the World Cup dashboard API.
package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

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
	yearSvc  YearService
	matchSvc MatchService
	logger   *slog.Logger
}

// New creates a new Handler with the given services and logger.
func New(yearSvc YearService, matchSvc MatchService, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{yearSvc: yearSvc, matchSvc: matchSvc, logger: logger}
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
func (h *Handler) GetGlobalLeaderboard(w http.ResponseWriter, r *http.Request) {
	// Query Polymarket gamma-api for all 2026 FIFA World Cup winner markets.
	// Each team has a binary market ("Will X win the 2026 FIFA World Cup?"),
	// where outcomePrices[0] = probability of "Yes".
	teamMarkets, err := h.fetchPolymarketTeams(r.Context())
	if err != nil {
		h.logger.Error("failed to fetch Polymarket teams", "error", err)
		writeError(w, http.StatusBadGateway, "failed to fetch prediction data from Polymarket")
		return
	}

	top10 := make([]GlobalLeaderboardResponse, 0, TopLeaderboardTeams)
	for i := 0; i < len(teamMarkets) && i < TopLeaderboardTeams; i++ {
		top10 = append(top10, teamMarkets[i])
	}

	writeJSON(w, http.StatusOK, top10)
}

// fetchPolymarketTeams queries the Polymarket gamma-api for all "Will X win the 2026 FIFA World Cup?" markets,
// extracts team names and "Yes" probabilities, and returns them sorted descending by probability.
func (h *Handler) fetchPolymarketTeams(ctx context.Context) ([]GlobalLeaderboardResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://gamma-api.polymarket.com/markets?limit=100", nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("User-Agent", "WorldCupDashboard/1.0")

	client := &http.Client{Timeout: 10 * time.Second}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling polymarket api: %w", err)
	}
	defer resp.Body.Close()

	var markets []struct {
		Question      string `json:"question"`
		OutcomePrices string `json:"outcomePrices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&markets); err != nil {
		return nil, fmt.Errorf("decoding polymarket response: %w", err)
	}

	var results []GlobalLeaderboardResponse
	for _, m := range markets {
		// Parse team name from "Will <Team> win the 2026 FIFA World Cup?"
		team := parseWorldCupTeam(m.Question)
		if team == "" {
			continue
		}

		var prices []string
		if err := json.Unmarshal([]byte(m.OutcomePrices), &prices); err != nil || len(prices) == 0 {
			continue
		}
		yesPrice, err := strconv.ParseFloat(prices[0], 64)
		if err != nil {
			continue
		}

		results = append(results, GlobalLeaderboardResponse{
			Team:        team,
			Probability: int(yesPrice * 100),
		})
	}

	// Sort descending by probability
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
