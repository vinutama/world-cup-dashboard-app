package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// mockYearService implements a stub year service for testing.
type mockYearService struct {
	years []int
	err   error
}

func (m *mockYearService) GetAvailableYears(ctx context.Context) ([]int, error) {
	return m.years, m.err
}

// mockMatchService implements a stub match service for testing.
type mockMatchService struct {
	tournaments []*model.Tournament
	err         error
}

func (m *mockMatchService) GetTournaments(ctx context.Context) ([]*model.Tournament, error) {
	return m.tournaments, m.err
}

func (m *mockMatchService) GetTournamentsByYear(ctx context.Context, year int) ([]*model.Tournament, error) {
	for _, t := range m.tournaments {
		if t.Year == year {
			return []*model.Tournament{t}, nil
		}
	}
	return nil, nil
}

func (m *mockMatchService) GetMatches(ctx context.Context, year int) ([]model.Match, error) {
	for _, t := range m.tournaments {
		if t.Year == year {
			return t.Matches, nil
		}
	}
	return nil, fmt.Errorf("tournament for year %d not found", year)
}

func (m *mockMatchService) GetMatch(ctx context.Context, year, idx int) (*model.Match, error) {
	for _, t := range m.tournaments {
		if t.Year == year {
			if idx >= 0 && idx < len(t.Matches) {
				return &t.Matches[idx], nil
			}
			return nil, fmt.Errorf("match index %d out of range for year %d", idx, year)
		}
	}
	return nil, fmt.Errorf("tournament for year %d not found", year)
}

func (m *mockMatchService) GetGoalAvalanche(ctx context.Context, year int) ([]model.TimelineEvent, error) {
	for _, t := range m.tournaments {
		if t.Year == year {
			return []model.TimelineEvent{}, nil
		}
	}
	return nil, fmt.Errorf("tournament for year %d not found", year)
}

func setupTestHandler() *Handler {
	return New(
		&mockYearService{
			years: []int{1930, 1934, 2018, 2022},
		},
		&mockMatchService{
			tournaments: []*model.Tournament{
				{
					Name: "World Cup 2018",
					Year: 2018,
					Matches: []model.Match{
						{
							Round:  "Matchday 1",
							Date:   "2018-06-14",
							Team1:  "Russia",
							Team2:  "Saudi Arabia",
							Score:  model.Score{FullTime: [2]int{5, 0}, HalfTime: [2]int{2, 0}},
							Group:  "Group A",
							Ground: "Luzhniki Stadium, Moscow",
						},
						{
							Round:  "Final",
							Date:   "2018-07-15",
							Team1:  "France",
							Team2:  "Croatia",
							Score:  model.Score{FullTime: [2]int{4, 2}, HalfTime: [2]int{2, 1}},
							Ground: "Luzhniki Stadium, Moscow",
						},
					},
				},
				{
					Name: "World Cup 2022",
					Year: 2022,
					Matches: []model.Match{
						{
							Round:  "Final",
							Date:   "2022-12-18",
							Team1:  "Argentina",
							Team2:  "France",
							Score:  model.Score{FullTime: [2]int{3, 3}, HalfTime: [2]int{2, 0}},
							Ground: "Lusail Stadium",
						},
					},
				},
			},
		},
		slog.Default(),
	)
}

func TestHealthEndpoint(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body map[string]string
	json.NewDecoder(rec.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Errorf("expected status=ok, got %v", body)
	}
}

func TestGetYears(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/years", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var years []int
	json.NewDecoder(rec.Body).Decode(&years)
	if len(years) != 4 {
		t.Fatalf("expected 4 years, got %d", len(years))
	}
	if years[0] != 1930 || years[3] != 2022 {
		t.Errorf("unexpected years: %v", years)
	}
}

func TestGetTournaments(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var tournaments []*model.Tournament
	json.NewDecoder(rec.Body).Decode(&tournaments)
	if len(tournaments) != 2 {
		t.Fatalf("expected 2 tournaments, got %d", len(tournaments))
	}
}

func TestGetTournaments_FilterByYear(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments?year=2022", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var tournaments []*model.Tournament
	json.NewDecoder(rec.Body).Decode(&tournaments)
	if len(tournaments) != 1 {
		t.Fatalf("expected 1 tournament, got %d", len(tournaments))
	}
	if tournaments[0].Year != 2022 {
		t.Errorf("expected year 2022, got %d", tournaments[0].Year)
	}
}

func TestGetTournaments_InvalidYearFilter(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments?year=abc", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestGetTournament_Success(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments/2018", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var tournament model.Tournament
	json.NewDecoder(rec.Body).Decode(&tournament)
	if tournament.Name != "World Cup 2018" {
		t.Errorf("expected World Cup 2018, got %s", tournament.Name)
	}
}

func TestGetTournament_NotFound(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments/9999", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestGetTournament_InvalidID(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments/abc", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestGetTournamentMatches(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments/2018/matches", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var result struct {
		Matches    []matchResponse `json:"matches"`
		Page       int             `json:"page"`
		PerPage    int             `json:"per_page"`
		Total      int             `json:"total"`
		TotalPages int             `json:"total_pages"`
	}
	json.NewDecoder(rec.Body).Decode(&result)
	if len(result.Matches) != 2 {
		t.Fatalf("expected 2 matches, got %d", len(result.Matches))
	}
	if result.Matches[0].Match.Team1 != "Russia" {
		t.Errorf("expected Russia, got %s", result.Matches[0].Match.Team1)
	}
	if result.Page != 1 {
		t.Errorf("expected page=1, got %d", result.Page)
	}
	if result.Total != 2 {
		t.Errorf("expected total=2, got %d", result.Total)
	}
	if result.TotalPages != 1 {
		t.Errorf("expected total_pages=1, got %d", result.TotalPages)
	}
}

func TestGetTournamentMatches_NotFound(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/tournaments/1950/matches", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestGetMatch_Success(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/matches/2018-0", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var match model.Match
	json.NewDecoder(rec.Body).Decode(&match)
	if match.Team1 != "Russia" {
		t.Errorf("expected Russia, got %s", match.Team1)
	}
}

func TestGetMatch_NotFound(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/matches/2018-999", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestGetMatch_InvalidID(t *testing.T) {
	h := setupTestHandler()
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/matches/invalid", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
