// Package model holds domain types for the World Cup dashboard.
package model

// Tournament represents a single World Cup tournament.
type Tournament struct {
	Name    string  `json:"name"`
	Year    int     `json:"year"`
	Matches []Match `json:"matches"`
}

// Match represents a single football match in a tournament.
type Match struct {
	Round   string `json:"round"`
	Date    string `json:"date"`
	Time    string `json:"time,omitempty"`
	Team1   string `json:"team1"`
	Team2   string `json:"team2"`
	Score   Score  `json:"score"`
	Goals1  []Goal `json:"goals1,omitempty"`
	Goals2  []Goal `json:"goals2,omitempty"`
	Group   string `json:"group,omitempty"`
	Ground  string `json:"ground,omitempty"`
}

// Score holds the full-time and half-time scores.
type Score struct {
	FullTime   [2]int `json:"ft"`
	HalfTime   [2]int `json:"ht"`
}

// Goal represents a goal event in a match.
type Goal struct {
	Name    string `json:"name"`
	Minute  int    `json:"minute"`
	Offset  *int   `json:"offset,omitempty"`
	OwnGoal *bool  `json:"owngoal,omitempty"`
	Penalty *bool  `json:"penalty,omitempty"`
}
