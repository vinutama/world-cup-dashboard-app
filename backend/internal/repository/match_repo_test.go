package repository

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchTournament_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"name": "World Cup 2018",
			"matches": [
				{
					"round": "Matchday 1",
					"date": "2018-06-14",
					"time": "18:00 UTC+3",
					"team1": "Russia",
					"team2": "Saudi Arabia",
					"score": {"ft": [5, 0], "ht": [2, 0]},
					"goals1": [{"name": "Gazinsky", "minute": 12}],
					"goals2": [],
					"group": "Group A",
					"ground": "Luzhniki Stadium, Moscow"
				}
			]
		}`))
	}))
	defer server.Close()

	repo := &MatchRepo{Client: http.DefaultClient, URLTmpl: server.URL + "/%d/test"}
	tournament, err := repo.FetchTournament(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if tournament.Name != "World Cup 2018" {
		t.Errorf("name = %q, want %q", tournament.Name, "World Cup 2018")
	}
	if tournament.Year != 2018 {
		t.Errorf("year = %d, want %d", tournament.Year, 2018)
	}
	if len(tournament.Matches) != 1 {
		t.Fatalf("expected 1 match, got %d", len(tournament.Matches))
	}

	m := tournament.Matches[0]
	if m.Team1 != "Russia" || m.Team2 != "Saudi Arabia" {
		t.Errorf("teams = %s vs %s, want Russia vs Saudi Arabia", m.Team1, m.Team2)
	}
	if m.Score.FullTime != [2]int{5, 0} {
		t.Errorf("ft score = %v, want [5,0]", m.Score.FullTime)
	}
	if len(m.Goals1) != 1 || m.Goals1[0].Name != "Gazinsky" {
		t.Errorf("got goals1 = %+v", m.Goals1)
	}
}

func TestFetchTournament_WithExtraFields(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"name": "World Cup 2022",
			"matches": [
				{
					"round": "Final",
					"date": "2022-12-18",
					"time": "18:00 UTC+3",
					"team1": "Argentina",
					"team2": "France",
					"score": {"ft": [3, 3], "ht": [2, 0]},
					"goals1": [
						{"name": "Messi", "minute": 23, "penalty": true},
						{"name": "Di Maria", "minute": 36}
					],
					"goals2": [
						{"name": "Mbappé", "minute": 80, "penalty": true},
						{"name": "Mbappé", "minute": 81},
						{"name": "Mbappé", "minute": 118, "penalty": true}
					],
					"group": "",
					"ground": "Lusail Stadium"
				}
			]
		}`))
	}))
	defer server.Close()

	repo := &MatchRepo{Client: http.DefaultClient, URLTmpl: server.URL + "/%d/test"}
	tournament, err := repo.FetchTournament(context.Background(), 2022)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(tournament.Matches) != 1 {
		t.Fatalf("expected 1 match, got %d", len(tournament.Matches))
	}

	m := tournament.Matches[0]
	if len(m.Goals1) != 2 {
		t.Fatalf("expected 2 goals for team1, got %d", len(m.Goals1))
	}
	if m.Goals1[0].Penalty == nil || !*m.Goals1[0].Penalty {
		t.Error("expected first goal to be a penalty")
	}
	if len(m.Goals2) != 3 {
		t.Fatalf("expected 3 goals for team2 (Mbappé hat trick), got %d", len(m.Goals2))
	}
}

func TestFetchTournament_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	repo := &MatchRepo{Client: http.DefaultClient, URLTmpl: server.URL + "/%d/test"}
	_, err := repo.FetchTournament(context.Background(), 3000)
	if err == nil {
		t.Fatal("expected error for 404, got nil")
	}
}

func TestFetchTournament_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{invalid json`))
	}))
	defer server.Close()

	repo := &MatchRepo{Client: http.DefaultClient, URLTmpl: server.URL + "/%d/test"}
	_, err := repo.FetchTournament(context.Background(), 2022)
	if err == nil {
		t.Fatal("expected error for malformed JSON, got nil")
	}
}

func TestFetchTournament_StringMinute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{
			"name": "World Cup 2026",
			"matches": [
				{
					"round": "Matchday 1",
					"date": "2026-06-11",
					"time": "13:00 UTC-6",
					"team1": "Mexico",
					"team2": "South Africa",
					"score": {"ft": [2, 0], "ht": [1, 0]},
					"goals1": [
						{"name": "Juli\u00e1n Qui\u00f1ones", "minute": "9"},
						{"name": "Ra\u00fal Jim\u00e9nez", "minute": "67"}
					],
					"goals2": [],
					"group": "Group A",
					"ground": "Mexico City"
				}
			]
		}`))
	}))
	defer server.Close()

	repo := &MatchRepo{Client: http.DefaultClient, URLTmpl: server.URL + "/%d/test"}
	tournament, err := repo.FetchTournament(context.Background(), 2026)
	if err != nil {
		t.Fatalf("unexpected error with string minutes: %v", err)
	}
	if tournament.Name != "World Cup 2026" {
		t.Errorf("name = %q, want %q", tournament.Name, "World Cup 2026")
	}
	if len(tournament.Matches) != 1 {
		t.Fatalf("expected 1 match, got %d", len(tournament.Matches))
	}
	m := tournament.Matches[0]
	if len(m.Goals1) != 2 {
		t.Fatalf("expected 2 goals, got %d", len(m.Goals1))
	}
	if m.Goals1[0].Name != "Juli\u00e1n Qui\u00f1ones" || m.Goals1[0].Minute != 9 {
		t.Errorf("first goal = %+v", m.Goals1[0])
	}
	if m.Goals1[1].Minute != 67 {
		t.Errorf("second goal minute = %d, want 67", m.Goals1[1].Minute)
	}
}
