// Package service tests
package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
)

func TestGetAvailableYears_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[
			{"name": "1930", "type": "dir"},
			{"name": "1998", "type": "dir"},
			{"name": "2022", "type": "dir"}
		]`))
	}))
	defer server.Close()

	repo := &repository.YearRepo{Client: http.DefaultClient, URL: server.URL}
	svc := NewYearService(repo)
	years, err := svc.GetAvailableYears(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := []int{1930, 1998, 2022}
	if len(years) != len(expected) {
		t.Fatalf("got %v, want %v", years, expected)
	}
	for i, y := range years {
		if y != expected[i] {
			t.Errorf("years[%d] = %d, want %d", i, y, expected[i])
		}
	}
}

func TestGetAvailableYears_Empty(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[]`))
	}))
	defer server.Close()

	repo := &repository.YearRepo{Client: http.DefaultClient, URL: server.URL}
	svc := NewYearService(repo)
	_, err := svc.GetAvailableYears(context.Background())
	if err == nil {
		t.Fatal("expected error for empty years, got nil")
	}
}

func TestGetAvailableYears_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	repo := &repository.YearRepo{Client: http.DefaultClient, URL: server.URL}
	svc := NewYearService(repo)
	_, err := svc.GetAvailableYears(context.Background())
	if err == nil {
		t.Fatal("expected error for HTTP 403, got nil")
	}
}
