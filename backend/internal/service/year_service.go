// Package service contains business logic for the World Cup dashboard.
package service

import (
	"context"
	"fmt"
	"sort"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// tournamentLister provides tournament data from a cached source.
type tournamentLister interface {
	GetTournaments(ctx context.Context) ([]*model.Tournament, error)
}

// YearService provides operations on World Cup year data.
// Years are derived from the tournament data, which is cached by MatchService.
type YearService struct {
	lister tournamentLister
}

// NewYearService creates a new YearService backed by a tournament data source.
func NewYearService(lister tournamentLister) *YearService {
	return &YearService{lister: lister}
}

// GetAvailableYears returns a sorted list of all World Cup years.
// Derives years from the cached tournament data.
func (s *YearService) GetAvailableYears(ctx context.Context) ([]int, error) {
	tournaments, err := s.lister.GetTournaments(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting available years: %w", err)
	}
	if len(tournaments) == 0 {
		return nil, fmt.Errorf("no World Cup years found")
	}
	years := make([]int, 0, len(tournaments))
	for _, t := range tournaments {
		years = append(years, t.Year)
	}
	sort.Ints(years)
	return years, nil
}
