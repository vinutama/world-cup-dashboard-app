package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
)

// testFixture returns test servers and properly configured repos for match tests.
func setupMatchFixture(t *testing.T) (*MatchService, func()) {
	t.Helper()

	// Year endpoint
	yearServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[
			{"name": "2018", "type": "dir"},
			{"name": "2022", "type": "dir"}
		]`))
	}))

	// Match data endpoint — respond with proper data for any year
	matchServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"name": "World Cup",
			"matches": [
				{
					"round": "Matchday 1",
					"date": "2022-11-20",
					"team1": "Qatar",
					"team2": "Ecuador",
					"score": {"ft": [0, 2], "ht": [0, 2]},
					"ground": "Al Bayt Stadium"
				}
			]
		}`))
	}))

	yearRepo := &repository.YearRepo{Client: http.DefaultClient, URL: yearServer.URL}
	matchRepo := &repository.MatchRepo{Client: http.DefaultClient, URLTmpl: matchServer.URL + "/%d/data"}
	svc := NewMatchService(yearRepo, matchRepo)

	cleanup := func() {
		yearServer.Close()
		matchServer.Close()
	}
	return svc, cleanup
}

func TestGetTournaments_CachesResults(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	// First call — fetches from servers
	tournaments, err := svc.GetTournaments(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(tournaments) != 2 {
		t.Fatalf("expected 2 tournaments, got %d", len(tournaments))
	}

	// Second call — should use cache (no additional HTTP calls)
	tournaments2, err := svc.GetTournaments(context.Background())
	if err != nil {
		t.Fatalf("unexpected error on cached call: %v", err)
	}
	if len(tournaments2) != 2 {
		t.Fatalf("expected 2 tournaments from cache, got %d", len(tournaments2))
	}
}

func TestGetTournamentsByYear(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	result, err := svc.GetTournamentsByYear(context.Background(), 2022)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 tournament for 2022, got %d", len(result))
	}
	if result[0].Year != 2022 {
		t.Errorf("year = %d, want 2022", result[0].Year)
	}
}

func TestGetTournamentsByYear_NotFound(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	result, err := svc.GetTournamentsByYear(context.Background(), 1950)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Fatalf("expected no tournaments for 1950, got %d", len(result))
	}
}

func TestGetMatches(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	matches, err := svc.GetMatches(context.Background(), 2022)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) == 0 {
		t.Fatal("expected at least 1 match")
	}
	if matches[0].Team1 != "Qatar" {
		t.Errorf("team1 = %s, want Qatar", matches[0].Team1)
	}
}

func TestGetMatch(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	match, err := svc.GetMatch(context.Background(), 2022, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if match.Team1 != "Qatar" {
		t.Errorf("team1 = %s, want Qatar", match.Team1)
	}
}

func TestGetMatch_OutOfRange(t *testing.T) {
	svc, cleanup := setupMatchFixture(t)
	defer cleanup()

	_, err := svc.GetMatch(context.Background(), 2022, 999)
	if err == nil {
		t.Fatal("expected error for out-of-range match index, got nil")
	}
}
