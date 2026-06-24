package service

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
)

// MatchService provides operations on World Cup match data.
// Uses a cache-once strategy: data is fetched on first access and stored in-memory
// for the lifetime of the service.
type MatchService struct {
	yearRepo  *repository.YearRepo
	matchRepo *repository.MatchRepo
	cache     *matchCache
}

type matchCache struct {
	mu          sync.RWMutex
	tournaments map[int]*model.Tournament // year → tournament
}

// NewMatchService creates a new MatchService.
func NewMatchService(yearRepo *repository.YearRepo, matchRepo *repository.MatchRepo) *MatchService {
	return &MatchService{
		yearRepo:  yearRepo,
		matchRepo: matchRepo,
		cache: &matchCache{
			tournaments: make(map[int]*model.Tournament),
		},
	}
}

// GetTournaments returns all World Cup tournaments.
// On first call, fetches and caches data from the GitHub repository.
func (s *MatchService) GetTournaments(ctx context.Context) ([]*model.Tournament, error) {
	// Check cache first
	s.cache.mu.RLock()
	if len(s.cache.tournaments) > 0 {
		result := make([]*model.Tournament, 0, len(s.cache.tournaments))
		for _, t := range s.cache.tournaments {
			result = append(result, t)
		}
		s.cache.mu.RUnlock()
		sort.SliceStable(result, func(i, j int) bool {
			return result[i].Year < result[j].Year
		})
		return result, nil
	}
	s.cache.mu.RUnlock()

	// Cache miss — fetch all years
	return s.refreshCache(ctx)
}

// GetTournamentsByYear filters tournaments by year.
func (s *MatchService) GetTournamentsByYear(ctx context.Context, year int) ([]*model.Tournament, error) {
	all, err := s.GetTournaments(ctx)
	if err != nil {
		return nil, err
	}
	for _, t := range all {
		if t.Year == year {
			return []*model.Tournament{t}, nil
		}
	}
	return nil, nil
}

// GetMatches returns all matches for a given tournament year.
func (s *MatchService) GetMatches(ctx context.Context, year int) ([]model.Match, error) {
	all, err := s.GetTournaments(ctx)
	if err != nil {
		return nil, err
	}
	for _, t := range all {
		if t.Year == year {
			return t.Matches, nil
		}
	}
	return nil, fmt.Errorf("tournament for year %d not found", year)
}

// GetMatch returns a single match by tournament year and match index.
func (s *MatchService) GetMatch(ctx context.Context, year, matchIdx int) (*model.Match, error) {
	matches, err := s.GetMatches(ctx, year)
	if err != nil {
		return nil, err
	}
	if matchIdx < 0 || matchIdx >= len(matches) {
		return nil, fmt.Errorf("match index %d out of range for year %d", matchIdx, year)
	}
	return &matches[matchIdx], nil
}

// refreshCache fetches all years and populates the in-memory cache.
func (s *MatchService) refreshCache(ctx context.Context) ([]*model.Tournament, error) {
	years, err := s.yearRepo.FetchYears(ctx)
	if err != nil {
		return nil, fmt.Errorf("refreshing cache: fetching years: %w", err)
	}

	tournaments := make([]*model.Tournament, 0, len(years))
	tmp := make(map[int]*model.Tournament, len(years))

	for _, year := range years {
		t, err := s.matchRepo.FetchTournament(ctx, year)
		if err != nil {
			// Log but continue — partial data is better than nothing
			fmt.Printf("warning: failed to fetch year %d: %v\n", year, err)
			continue
		}
		// Sort matches by date for consistent ordering across refreshes
		sort.SliceStable(t.Matches, func(i, j int) bool {
			return t.Matches[i].Date < t.Matches[j].Date
		})
		tmp[year] = t
		tournaments = append(tournaments, t)
	}

	// Atomically swap cache
	s.cache.mu.Lock()
	s.cache.tournaments = tmp
	s.cache.mu.Unlock()

	return tournaments, nil
}
