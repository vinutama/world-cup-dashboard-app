// Package service contains business logic for the World Cup dashboard.
package service

import (
	"context"
	"fmt"
	"sort"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
)

// YearService provides operations on World Cup year data.
type YearService struct {
	repo *repository.YearRepo
}

// NewYearService creates a new YearService with the given repository.
func NewYearService(repo *repository.YearRepo) *YearService {
	return &YearService{repo: repo}
}

// GetAvailableYears returns a sorted list of all World Cup years.
// Delegates to the repository for data fetching.
func (s *YearService) GetAvailableYears(ctx context.Context) ([]int, error) {
	years, err := s.repo.FetchYears(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting available years: %w", err)
	}
	if len(years) == 0 {
		return nil, fmt.Errorf("no World Cup years found")
	}
	sort.Ints(years)
	return years, nil
}
