// Package repository tests
package repository

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchYears_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[
			{"name": "2022", "type": "dir"},
			{"name": "1930", "type": "dir"},
			{"name": "2018", "type": "dir"},
			{"name": "1934", "type": "dir"},
			{"name": "README.md", "type": "file"},
			{"name": "LICENSE.md", "type": "file"}
		]`))
	}))
	defer server.Close()

	repo := &YearRepo{Client: http.DefaultClient, URL: server.URL}
	years, err := repo.FetchYears(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(years) != 4 {
		t.Fatalf("expected 4 years, got %d: %v", len(years), years)
	}

	// Repo returns raw order (GitHub API order) — no sorting test
	if years[0] != 2022 || years[2] != 2018 {
		t.Errorf("expected raw API order, got %v", years)
	}
}

func TestFetchYears_SkipsNonNumericDirs(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[
			{"name": "2022", "type": "dir"},
			{"name": "assets", "type": "dir"},
			{"name": "scripts", "type": "dir"}
		]`))
	}))
	defer server.Close()

	repo := &YearRepo{Client: http.DefaultClient, URL: server.URL}
	years, err := repo.FetchYears(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(years) != 1 || years[0] != 2022 {
		t.Fatalf("expected only [2022], got %v", years)
	}
}

func TestFetchYears_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	repo := &YearRepo{Client: http.DefaultClient, URL: server.URL}
	_, err := repo.FetchYears(context.Background())
	if err == nil {
		t.Fatal("expected error for server error, got nil")
	}
}

func TestFetchYears_EmptyResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`[]`))
	}))
	defer server.Close()

	repo := &YearRepo{Client: http.DefaultClient, URL: server.URL}
	years, err := repo.FetchYears(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(years) != 0 {
		t.Fatalf("expected empty slice, got %v", years)
	}
}
