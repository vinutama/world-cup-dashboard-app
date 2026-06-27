// Package handler contains HTTP handlers for the World Cup dashboard API.
package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"

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

	total := len(allMatches)
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
	matches := make([]matchResponse, 0, end-start)
	for i, m := range allMatches[start:end] {
		originalIndex := start + i
		if sortOrder == "desc" {
			originalIndex = total - 1 - originalIndex
		}
		matches = append(matches, matchResponse{
			Match:         m,
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
