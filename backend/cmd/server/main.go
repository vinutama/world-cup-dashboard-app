// Command server is the entry point for the World Cup Dashboard backend.
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/handler"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/middleware"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Initialize layers
	httpClient := &http.Client{}

	yearRepo := repository.NewYearRepo(httpClient)
	matchRepo := repository.NewMatchRepo(httpClient)

	matchSvc := service.NewMatchService(yearRepo, matchRepo)
	yearSvc := service.NewYearService(matchSvc)

	h := handler.New(yearSvc, matchSvc, logger)

	// Set up routing
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Apply middleware
	var srv http.Handler = mux
	srv = middleware.Logger(logger)(srv)
	srv = middleware.CORS(srv)

	addr := ":8080"
	logger.Info("starting server", "addr", addr)
	if err := http.ListenAndServe(addr, srv); err != nil {
		logger.Error("server failed", "error", err)
		os.Exit(1)
	}
}
