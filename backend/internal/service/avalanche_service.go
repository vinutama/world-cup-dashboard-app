package service

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// GetGoalAvalanche returns a sorted timeline of all goal events for a tournament year.
func (s *MatchService) GetGoalAvalanche(ctx context.Context, year int) ([]model.TimelineEvent, error) {
	matches, err := s.GetMatches(ctx, year)
	if err != nil {
		return nil, fmt.Errorf("get matches: %w", err)
	}

	if len(matches) == 0 {
		return []model.TimelineEvent{}, nil
	}

	matchDays := computeMatchDays(matches)
	events := make([]model.TimelineEvent, 0, len(matches)*4) // avg ~4 goals per match

	for matchIdx, m := range matches {
		matchID := fmt.Sprintf("%d-%d", year, matchIdx)
		team1Goals := 0
		team2Goals := 0

		for _, g := range m.Goals1 {
			team1Goals++
			events = append(events, model.TimelineEvent{
				MatchID:      matchID,
				TeamA:        m.Team1,
				TeamB:        m.Team2,
				Scorer:       scorerName(g),
				TeamScored:   m.Team1,
				Minute:       effectiveMinute(g),
				MatchDay:     matchDays[matchIdx],
				CurrentScore: fmt.Sprintf("%d-%d", team1Goals, team2Goals),
				IsClustered:  false,
			})
		}

		for _, g := range m.Goals2 {
			team2Goals++
			events = append(events, model.TimelineEvent{
				MatchID:      matchID,
				TeamA:        m.Team1,
				TeamB:        m.Team2,
				Scorer:       scorerName(g),
				TeamScored:   m.Team2,
				Minute:       effectiveMinute(g),
				MatchDay:     matchDays[matchIdx],
				CurrentScore: fmt.Sprintf("%d-%d", team1Goals, team2Goals),
				IsClustered:  false,
			})
		}
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].MatchDay != events[j].MatchDay {
			return events[i].MatchDay < events[j].MatchDay
		}
		return events[i].Minute < events[j].Minute
	})

	return events, nil
}

// computeMatchDays derives a 1‑based match day from each match's date,
// using the first match's date as day 1.
func computeMatchDays(matches []model.Match) []int {
	firstDate := parseDate(matches[0].Date)
	days := make([]int, len(matches))

	for i, m := range matches {
		d := parseDate(m.Date)
		if d.IsZero() || firstDate.IsZero() {
			days[i] = 1
			continue
		}
		diff := int(d.Sub(firstDate).Hours() / 24)
		if diff < 0 {
			diff = 0
		}
		days[i] = diff + 1
	}

	return days
}

// parseDate tries common date layouts used by worldcup.json.
func parseDate(s string) time.Time {
	for _, layout := range []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
	} {
		t, err := time.Parse(layout, s)
		if err == nil {
			return t
		}
	}
	return time.Time{}
}

// scorerName returns the player name or "N/A" if empty.
func scorerName(g model.Goal) string {
	if g.Name != "" {
		return g.Name
	}
	return "N/A"
}

// effectiveMinute returns the goal minute including injury‑time offset.
func effectiveMinute(g model.Goal) int {
	if g.Offset != nil && *g.Offset > 0 {
		return g.Minute + *g.Offset
	}
	return g.Minute
}
