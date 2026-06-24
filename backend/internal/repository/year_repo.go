// Package repository handles data access from external sources.
package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// GitHubContent represents a single item from the GitHub API contents endpoint.
type GitHubContent struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

const defaultYearsURL = "https://api.github.com/repos/openfootball/worldcup.json/contents/"

// YearRepo fetches World Cup year data from the openfootball GitHub repository.
type YearRepo struct {
	Client *http.Client
	URL    string
}

// NewYearRepo creates a new YearRepo with default settings.
func NewYearRepo(client *http.Client) *YearRepo {
	if client == nil {
		client = http.DefaultClient
	}
	return &YearRepo{Client: client, URL: defaultYearsURL}
}

// FetchYears calls the GitHub API to list available World Cup year directories.
// Returns a sorted list of year integers and any error encountered.
func (r *YearRepo) FetchYears(ctx context.Context) ([]int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.URL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "world-cup-dashboard/0.1")

	resp, err := r.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching years: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var contents []GitHubContent
	if err := json.NewDecoder(resp.Body).Decode(&contents); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	var years []int
	for _, item := range contents {
		if item.Type != "dir" {
			continue
		}
		year, err := strconv.Atoi(item.Name)
		if err != nil {
			continue // skip non-numeric directory names
		}
		years = append(years, year)
	}

	return years, nil
}
