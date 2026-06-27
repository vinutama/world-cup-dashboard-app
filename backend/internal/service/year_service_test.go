// Package service tests
package service

import (
	"context"
	"errors"
	"testing"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/model"
)

// mockTournamentLister implements tournamentLister for testing.
type mockTournamentLister struct {
	tournaments []*model.Tournament
	err         error
}

func (m *mockTournamentLister) GetTournaments(ctx context.Context) ([]*model.Tournament, error) {
	return m.tournaments, m.err
}

func TestGetAvailableYears_Success(t *testing.T) {
	mock := &mockTournamentLister{
		tournaments: []*model.Tournament{
			{Year: 2022},
			{Year: 1930},
			{Year: 1998},
		},
	}
	svc := NewYearService(mock)
	years, err := svc.GetAvailableYears(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := []int{1930, 1998, 2022}
	if len(years) != len(expected) {
		t.Fatalf("got %v (len=%d), want %v (len=%d)", years, len(years), expected, len(expected))
	}
	for i, y := range years {
		if y != expected[i] {
			t.Errorf("years[%d] = %d, want %d (sorted ascending)", i, y, expected[i])
		}
	}
}

func TestGetAvailableYears_Empty(t *testing.T) {
	mock := &mockTournamentLister{
		tournaments: []*model.Tournament{},
	}
	svc := NewYearService(mock)
	_, err := svc.GetAvailableYears(context.Background())
	if err == nil {
		t.Fatal("expected error for empty years, got nil")
	}
}

func TestGetAvailableYears_ListerError(t *testing.T) {
	mock := &mockTournamentLister{
		err: errors.New("rate limited"),
	}
	svc := NewYearService(mock)
	_, err := svc.GetAvailableYears(context.Background())
	if err == nil {
		t.Fatal("expected error when lister fails, got nil")
	}
}
