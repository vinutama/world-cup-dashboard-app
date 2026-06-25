package model

// TimelineEvent represents a single goal event in the goal avalanche timeline.
type TimelineEvent struct {
	MatchID      string `json:"match_id"`
	TeamA        string `json:"team_a"`
	TeamB        string `json:"team_b"`
	Scorer       string `json:"scorer"`
	TeamScored   string `json:"team_scored"`
	Minute       int    `json:"minute"`
	MatchDay     int    `json:"match_day"`
	CurrentScore string `json:"current_score"`
	IsClustered  bool   `json:"is_clustered"`
}
