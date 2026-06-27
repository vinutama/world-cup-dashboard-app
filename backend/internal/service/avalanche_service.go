package service

import (
	"context"
	"fmt"
	"sort"
	"strconv"
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

		// Combine goals from both teams and sort by effective minute
		// so current_score is computed in true chronological order.
		type scoredGoal struct {
			goal    model.Goal
			isTeam1 bool
		}
		allGoals := make([]scoredGoal, 0, len(m.Goals1)+len(m.Goals2))
		for _, g := range m.Goals1 {
			allGoals = append(allGoals, scoredGoal{goal: g, isTeam1: true})
		}
		for _, g := range m.Goals2 {
			allGoals = append(allGoals, scoredGoal{goal: g, isTeam1: false})
		}
		sort.Slice(allGoals, func(i, j int) bool {
			return effectiveMinute(allGoals[i].goal) < effectiveMinute(allGoals[j].goal)
		})

		team1Goals := 0
		team2Goals := 0
		for _, sg := range allGoals {
			if sg.isTeam1 {
				team1Goals++
			} else {
				team2Goals++
			}
			teamScored := m.Team2
			if sg.isTeam1 {
				teamScored = m.Team1
			}
			events = append(events, model.TimelineEvent{
				MatchID:      matchID,
				TeamA:        m.Team1,
				TeamB:        m.Team2,
				Scorer:       scorerName(sg.goal),
				TeamScored:   teamScored,
				Minute:       effectiveMinute(sg.goal),
				MinuteLabel:  minuteLabel(sg.goal),
				MatchDay:     matchDays[matchIdx],
				CurrentScore: fmt.Sprintf("%d-%d", team1Goals, team2Goals),
				IsClustered:  false,
				Round:        m.Round,
				FullTime:     fmt.Sprintf("%d-%d", m.Score.FullTime[0], m.Score.FullTime[1]),
				Kickoff:      m.Time,
			})
		}
	}

	sort.Slice(events, func(i, j int) bool {
		if events[i].MatchDay != events[j].MatchDay {
			return events[i].MatchDay < events[j].MatchDay
		}
		return events[i].Minute < events[j].Minute
	})

	// Detect chaos zones before returning
	detectChaosZones(events)

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

// minuteLabel returns the human-readable minute display string.
// If the goal has an offset (stoppage time), shows "45+3" format.
// Otherwise shows just the minute, e.g. "7".
func minuteLabel(g model.Goal) string {
	if g.Offset != nil && *g.Offset > 0 {
		return fmt.Sprintf("%d+%d", g.Minute, *g.Offset)
	}
	return strconv.Itoa(g.Minute)
}

// effectiveMinute returns the goal minute including injury‑time offset.
func effectiveMinute(g model.Goal) int {
	if g.Offset != nil && *g.Offset > 0 {
		return g.Minute + *g.Offset
	}
	return g.Minute
}

// chaosWindow is the maximum minute gap for two events to be in the same chaos zone.
const chaosWindow = 3

// detectChaosZones scans events (sorted by matchDay then minute) and marks events
// whose minutes are ≤3 apart across *different* matches on the same (match day, kickoff).
// This ensures only goals from *concurrently-played* matches can form a chaos zone.
func detectChaosZones(events []model.TimelineEvent) {
	// Group by (match day, kickoff) — chaos zones don't cross days or kickoff slots.
	// When kickoff data is missing (empty string), treat each event as its own group
	// so goals without kickoff data are never falsely flagged as chaos.
	start := 0
	for start < len(events) {
		day := events[start].MatchDay
		ko := events[start].Kickoff
		end := start
		if ko != "" {
			for end+1 < len(events) && events[end+1].MatchDay == day && events[end+1].Kickoff == ko {
				end++
			}
		}
		group := events[start : end+1]

		// Within the day group, find clusters using a sliding window.
		// i is the start of the current window, j expands it.
		i := 0
		for i < len(group) {
			j := i
			// Expand window while events are ≤3 minutes from group[i]
			for j+1 < len(group) && group[j+1].Minute-group[i].Minute <= chaosWindow {
				j++
			}

			// If the window spans multiple match IDs, it's a chaos zone.
			if hasMultipleMatches(group[i : j+1]) {
				for k := i; k <= j; k++ {
					group[k].IsClustered = true
				}
			}

			i++
		}

		start = end + 1
	}
}

// hasMultipleMatches returns true when the slice contains events from
// more than one distinct match.
func hasMultipleMatches(events []model.TimelineEvent) bool {
	if len(events) < 2 {
		return false
	}
	first := events[0].MatchID
	for _, e := range events[1:] {
		if e.MatchID != first {
			return true
		}
	}
	return false
}
