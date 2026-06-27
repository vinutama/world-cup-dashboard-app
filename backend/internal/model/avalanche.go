package model

// TimelineEvent represents a single goal event in the goal avalanche timeline.
type TimelineEvent struct {
	MatchID      string `json:"matchId"`
	TeamA        string `json:"teamA"`
	TeamB        string `json:"teamB"`
	Scorer       string `json:"scorer"`
	TeamScored   string `json:"teamScored"`
	Minute       int    `json:"minute"`
	MinuteLabel  string `json:"minuteLabel"`
	MatchDay     int    `json:"matchDay"`
	CurrentScore string `json:"currentScore"`
	IsClustered  bool   `json:"isClustered"`
	Round        string `json:"round"`
	FullTime     string `json:"fullTime"`
	Kickoff      string `json:"kickoff"`
}
