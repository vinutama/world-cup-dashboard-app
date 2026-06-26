package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

const defaultMatchDataURL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/%d/worldcup.json"

// rawTournament is the raw JSON structure from the openfootball API.
type rawTournament struct {
	Name    string     `json:"name"`
	Matches []rawMatch `json:"matches"`
}

type rawMatch struct {
	Round  string    `json:"round"`
	Date   string    `json:"date"`
	Time   string    `json:"time,omitempty"`
	Team1  string    `json:"team1"`
	Team2  string    `json:"team2"`
	Score  rawScore  `json:"score"`
	Goals1 []rawGoal `json:"goals1,omitempty"`
	Goals2 []rawGoal `json:"goals2,omitempty"`
	Group  string    `json:"group,omitempty"`
	Ground string    `json:"ground,omitempty"`
}

type rawScore struct {
	FT [2]int `json:"ft"`
	HT [2]int `json:"ht"`
}

type rawGoal struct {
	Name    string      `json:"name"`
	Minute  interface{} `json:"minute"`
	Offset  *int        `json:"offset,omitempty"`
	OwnGoal *bool       `json:"owngoal,omitempty"`
	Penalty *bool       `json:"penalty,omitempty"`
}

// MatchRepo fetches World Cup match data from the openfootball GitHub repository.
type MatchRepo struct {
	Client  *http.Client
	URLTmpl string // fmt template with %d for year, e.g. ".../%d/worldcup.json"
}

// NewMatchRepo creates a new MatchRepo with default settings.
func NewMatchRepo(client *http.Client) *MatchRepo {
	if client == nil {
		client = http.DefaultClient
	}
	return &MatchRepo{Client: client, URLTmpl: defaultMatchDataURL}
}

// FetchTournament fetches worldcup.json for a given year and parses it into a Tournament.
func (r *MatchRepo) FetchTournament(ctx context.Context, year int) (*model.Tournament, error) {
	url := fmt.Sprintf(r.URLTmpl, year)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request for year %d: %w", year, err)
	}

	req.Header.Set("User-Agent", "world-cup-dashboard/0.1")

	resp, err := r.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching year %d: %w", year, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("year %d returned status %d", year, resp.StatusCode)
	}

	var raw rawTournament
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("decoding year %d: %w", year, err)
	}

	tournament := &model.Tournament{
		Name: raw.Name,
		Year: year,
	}
	for _, rm := range raw.Matches {
		match := model.Match{
			Round:  rm.Round,
			Date:   rm.Date,
			Time:   rm.Time,
			Team1:  rm.Team1,
			Team2:  rm.Team2,
			Score:  model.Score{FullTime: rm.Score.FT, HalfTime: rm.Score.HT},
			Group:  rm.Group,
			Ground: rm.Ground,
		}
		for _, rg := range rm.Goals1 {
			match.Goals1 = append(match.Goals1, convertGoal(rg))
		}
		for _, rg := range rm.Goals2 {
			match.Goals2 = append(match.Goals2, convertGoal(rg))
		}
		tournament.Matches = append(tournament.Matches, match)
	}

	return tournament, nil
}

func convertGoal(rg rawGoal) model.Goal {
	var minute int
	switch v := rg.Minute.(type) {
	case float64:
		minute = int(v)
	case string:
		minute, _ = strconv.Atoi(v)
	}
	return model.Goal{
		Name:    rg.Name,
		Minute:  minute,
		Offset:  rg.Offset,
		OwnGoal: rg.OwnGoal,
		Penalty: rg.Penalty,
	}
}
