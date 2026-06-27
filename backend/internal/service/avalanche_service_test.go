package service

import (
	"context"
	"testing"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// compile‑time check that TimelineEvent fields match what we expect.
func goal(team string, minute int, offset *int) model.Goal {
	return model.Goal{
		Name:   "Player",
		Minute: minute,
		Offset: offset,
	}
}

func matchWithGoals(team1, team2 string, g1, g2 []model.Goal, date, ground string) model.Match {
	m := model.Match{
		Team1:  team1,
		Team2:  team2,
		Date:   date,
		Ground: ground,
		Score:  model.Score{FullTime: [2]int{0, 0}},
	}
	if g1 != nil {
		m.Goals1 = g1
	}
	if g2 != nil {
		m.Goals2 = g2
	}
	return m
}

func TestGetGoalAvalanche_EmptyMatches(t *testing.T) {
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				9999: {
					Name:    "Unknown",
					Year:    9999,
					Matches: []model.Match{},
				},
			},
		},
	}
	events, err := svc.GetGoalAvalanche(context.Background(), 9999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 0 {
		t.Fatalf("expected 0 events for unknown year, got %d", len(events))
	}
}

func TestGetGoalAvalanche_SingleGoal(t *testing.T) {
	// Only Egypt‑Uruguay has a goal on day 2.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						// Match 0: Russia–Saudi Arabia, day 1, no goals here
						{
							Team1: "Russia", Team2: "Saudi Arabia",
							Date: "2018-06-14",
						},
						// Match 1: Egypt–Uruguay, day 2, one goal
						matchWithGoals("Egypt", "Uruguay", nil, []model.Goal{
							{Name: "Giménez", Minute: 89},
						}, "2018-06-15", ""),
						// Match 2: placeholder so slice length ≥ 2
						{Team1: "Morocco", Team2: "Iran", Date: "2018-06-15"},
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}

	e := events[0]
	if e.MatchID != "2018-1" {
		t.Errorf("match_id = %s, want 2018-1", e.MatchID)
	}
	if e.TeamScored != "Uruguay" {
		t.Errorf("team_scored = %s, want Uruguay", e.TeamScored)
	}
	if e.Scorer != "Giménez" {
		t.Errorf("scorer = %s, want Giménez", e.Scorer)
	}
	if e.CurrentScore != "0-1" {
		t.Errorf("current_score = %s, want 0-1", e.CurrentScore)
	}
	if e.Minute != 89 {
		t.Errorf("minute = %d, want 89", e.Minute)
	}
	if e.MatchDay != 2 {
		t.Errorf("match_day = %d, want 2", e.MatchDay)
	}
}

func TestGetGoalAvalanche_NonChronologicalJSONSortsCorrectly(t *testing.T) {
	// Russia–Saudi Arabia goals are in non‑chronological order in the JSON.
	// After sorting by effective minute, current_score must be correct.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						matchWithGoals("Russia", "Saudi Arabia", []model.Goal{
							{Name: "Gazinsky", Minute: 12},
							{Name: "Cheryshev", Minute: 43},
							{Name: "Cheryshev", Minute: 90, Offset: intPtr(1)},
							{Name: "Dzyuba", Minute: 71},
							{Name: "Golovin", Minute: 90, Offset: intPtr(4)},
						}, nil, "2018-06-14", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 5 {
		t.Fatalf("expected 5 events, got %d", len(events))
	}

	// After sort by minute: 12, 43, 71, 91, 94
	expected := []struct {
		minute int
		score  string
		scorer string
	}{
		{12, "1-0", "Gazinsky"},
		{43, "2-0", "Cheryshev"},
		{71, "3-0", "Dzyuba"},
		{91, "4-0", "Cheryshev"}, // 90+1 = 91
		{94, "5-0", "Golovin"},   // 90+4 = 94
	}

	for i, exp := range expected {
		e := events[i]
		if e.Minute != exp.minute {
			t.Errorf("event[%d] minute = %d, want %d", i, e.Minute, exp.minute)
		}
		if e.CurrentScore != exp.score {
			t.Errorf("event[%d] current_score = %s, want %s (scorer %s)", i, e.CurrentScore, exp.score, e.Scorer)
		}
		if e.Scorer != exp.scorer {
			t.Errorf("event[%d] scorer = %s, want %s", i, e.Scorer, exp.scorer)
		}
	}
}

func TestGetGoalAvalanche_InterleavedTeams(t *testing.T) {
	// Portugal vs Spain — goals from both teams must be interleaved by minute.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						// Several empty matches to push Portugal‑Spain to day 2
						{Team1: "A", Team2: "B", Date: "2018-06-14"},
						{Team1: "C", Team2: "D", Date: "2018-06-15"},
						{Team1: "E", Team2: "F", Date: "2018-06-15"},
						{Team1: "G", Team2: "H", Date: "2018-06-15"},
						{Team1: "I", Team2: "J", Date: "2018-06-15"},
						{Team1: "K", Team2: "L", Date: "2018-06-15"},
						{Team1: "M", Team2: "N", Date: "2018-06-15"},
						matchWithGoals("Portugal", "Spain", []model.Goal{
							{Name: "Ronaldo", Minute: 4},
							{Name: "Ronaldo", Minute: 44},
							{Name: "Ronaldo", Minute: 88},
						}, []model.Goal{
							{Name: "Costa", Minute: 24},
							{Name: "Costa", Minute: 55},
							{Name: "Nacho", Minute: 58},
						}, "2018-06-15", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Filter only Portugal‑Spain events
	var pse []model.TimelineEvent
	for _, e := range events {
		if e.TeamA == "Portugal" {
			pse = append(pse, e)
		}
	}
	if len(pse) != 6 {
		t.Fatalf("expected 6 Portugal‑Spain events, got %d", len(pse))
	}

	expected := []struct {
		minute int
		score  string
		scorer string
		team   string
	}{
		{4, "1-0", "Ronaldo", "Portugal"},
		{24, "1-1", "Costa", "Spain"},
		{44, "2-1", "Ronaldo", "Portugal"},
		{55, "2-2", "Costa", "Spain"},
		{58, "2-3", "Nacho", "Spain"},
		{88, "3-3", "Ronaldo", "Portugal"},
	}

	for i, exp := range expected {
		e := pse[i]
		if e.Minute != exp.minute {
			t.Errorf("event[%d] minute = %d, want %d", i, e.Minute, exp.minute)
		}
		if e.CurrentScore != exp.score {
			t.Errorf("event[%d] current_score = %s, want %s", i, e.CurrentScore, exp.score)
		}
		if e.Scorer != exp.scorer {
			t.Errorf("event[%d] scorer = %s, want %s", i, e.Scorer, exp.scorer)
		}
		if e.TeamScored != exp.team {
			t.Errorf("event[%d] team_scored = %s, want %s", i, e.TeamScored, exp.team)
		}
	}
}

func TestGetGoalAvalanche_InjuryTimeOffset(t *testing.T) {
	// Verify that offset is included in the display minute.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						matchWithGoals("TeamA", "TeamB", []model.Goal{
							{Name: "X", Minute: 45, Offset: intPtr(3)},
							{Name: "Y", Minute: 90, Offset: intPtr(5)},
						}, nil, "2018-06-14", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	if events[0].Minute != 48 {
		t.Errorf("first goal minute = %d, want 48 (45+3)", events[0].Minute)
	}
	if events[1].Minute != 95 {
		t.Errorf("second goal minute = %d, want 95 (90+5)", events[1].Minute)
	}
}

func TestGetGoalAvalanche_ChaosZone_DifferentMatches(t *testing.T) {
	// Two goals from different matches on day 2, 2 minutes apart → chaos zone.
	m1 := matchWithGoals("Match1", "Opp1", []model.Goal{
		{Name: "P1", Minute: 10},
	}, nil, "2018-06-15", "Stadium")
	m1.Time = "18:00"
	m2 := matchWithGoals("Match2", "Opp2", nil, []model.Goal{
		{Name: "P2", Minute: 12},
	}, "2018-06-15", "Stadium")
	m2.Time = "18:00"
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						{Team1: "A", Team2: "B", Date: "2018-06-14"},
						m1,
						m2,
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Filter day 2 events (chaos zone candidates)
	var day2 []model.TimelineEvent
	for _, e := range events {
		if e.MatchDay == 2 {
			day2 = append(day2, e)
		}
	}
	if len(day2) != 2 {
		t.Fatalf("expected 2 day-2 events, got %d", len(day2))
	}

	if !day2[0].IsClustered {
		t.Errorf("event[0] (minute %d) should be clustered (different matches, 2 min apart)", day2[0].Minute)
	}
	if !day2[1].IsClustered {
		t.Errorf("event[1] (minute %d) should be clustered (different matches, 2 min apart)", day2[1].Minute)
	}
}

func TestGetGoalAvalanche_ChaosZone_SameMatchNotClustered(t *testing.T) {
	// Two goals from the same match, 1 minute apart → NOT a chaos zone.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						{Team1: "A", Team2: "B", Date: "2018-06-14"},
						matchWithGoals("TeamX", "TeamY", []model.Goal{
							{Name: "Scorer1", Minute: 10},
							{Name: "Scorer2", Minute: 11},
						}, nil, "2018-06-15", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var day2 []model.TimelineEvent
	for _, e := range events {
		if e.MatchDay == 2 {
			day2 = append(day2, e)
		}
	}
	if len(day2) != 2 {
		t.Fatalf("expected 2 day-2 events, got %d", len(day2))
	}

	if day2[0].IsClustered {
		t.Errorf("event[0] should NOT be clustered (same match)")
	}
	if day2[1].IsClustered {
		t.Errorf("event[1] should NOT be clustered (same match)")
	}
}

func TestGetGoalAvalanche_ChaosZone_NoClusterWhenFarApart(t *testing.T) {
	// Two goals from different matches on day 2, 10 minutes apart → NOT clustered.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						{Team1: "A", Team2: "B", Date: "2018-06-14"},
						matchWithGoals("Match1", "Opp1", []model.Goal{
							{Name: "P1", Minute: 5},
						}, nil, "2018-06-15", ""),
						matchWithGoals("Match2", "Opp2", nil, []model.Goal{
							{Name: "P2", Minute: 20},
						}, "2018-06-15", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var day2 []model.TimelineEvent
	for _, e := range events {
		if e.MatchDay == 2 {
			day2 = append(day2, e)
		}
	}
	if len(day2) != 2 {
		t.Fatalf("expected 2 day-2 events, got %d", len(day2))
	}

	if day2[0].IsClustered {
		t.Errorf("event[0] should NOT be clustered (15 min apart)")
	}
	if day2[1].IsClustered {
		t.Errorf("event[1] should NOT be clustered (15 min apart)")
	}
}

func TestGetGoalAvalanche_ChaosZone_CrossDayNotClustered(t *testing.T) {
	// Two goals from different matches, same minute but different days → NOT clustered.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						matchWithGoals("Match1", "Opp1", []model.Goal{
							{Name: "P1", Minute: 10},
						}, nil, "2018-06-14", ""),
						matchWithGoals("Match2", "Opp2", nil, []model.Goal{
							{Name: "P2", Minute: 10},
						}, "2018-06-15", ""),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for i, e := range events {
		if e.IsClustered {
			t.Errorf("event[%d] (day %d, minute %d) should NOT be clustered (different days)", i, e.MatchDay, e.Minute)
		}
	}
}

func TestGetGoalAvalanche_ChaosZone_DifferentKickoffNotClustered(t *testing.T) {
	// Two goals from different matches on the same day, same minute (10'),
	// but with DIFFERENT kickoff times (12:00 vs 16:00) → NOT clustered.
	svc := &MatchService{
		cache: &matchCache{
			tournaments: map[int]*model.Tournament{
				2018: {
					Name: "2018",
					Year: 2018,
					Matches: []model.Match{
						{Team1: "A", Team2: "B", Date: "2018-06-14"},
						func() model.Match {
							m := matchWithGoals("Match1", "Opp1", []model.Goal{
								{Name: "P1", Minute: 10},
							}, nil, "2018-06-15", "Stadium A")
							m.Time = "12:00"
							return m
						}(),
						func() model.Match {
							m := matchWithGoals("Match2", "Opp2", nil, []model.Goal{
								{Name: "P2", Minute: 10},
							}, "2018-06-15", "Stadium B")
							m.Time = "16:00"
							return m
						}(),
					},
				},
			},
		},
	}

	events, err := svc.GetGoalAvalanche(context.Background(), 2018)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Filter day 2 events (both matches are on day 2)
	var day2 []model.TimelineEvent
	for _, e := range events {
		if e.MatchDay == 2 {
			day2 = append(day2, e)
		}
	}
	if len(day2) != 2 {
		t.Fatalf("expected 2 day-2 events, got %d", len(day2))
	}

	if day2[0].IsClustered {
		t.Errorf("event[0] (kickoff %s, minute %d) should NOT be clustered (different kickoff)", day2[0].Kickoff, day2[0].Minute)
	}
	if day2[1].IsClustered {
		t.Errorf("event[1] (kickoff %s, minute %d) should NOT be clustered (different kickoff)", day2[1].Kickoff, day2[1].Minute)
	}
}

func intPtr(v int) *int { return &v }
