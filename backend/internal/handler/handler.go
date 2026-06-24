// Package handler contains HTTP handlers for the World Cup dashboard API.
package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
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

// GetTournamentMatches returns all matches for a tournament.
func (h *Handler) GetTournamentMatches(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	year, err := strconv.Atoi(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tournament id — must be a year")
		return
	}

	matches, err := h.matchSvc.GetMatches(r.Context(), year)
	if err != nil {
		h.logger.Error("failed to get matches", "year", year, "error", err)
		writeError(w, http.StatusNotFound, "tournament not found")
		return
	}
	writeJSON(w, http.StatusOK, matches)
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
