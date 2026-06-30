// Command server is the entry point for the World Cup Dashboard backend.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/mkhevin/world-cup-dashboard/backend/internal/handler"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/middleware"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/repository"
	"github.com/mkhevin/world-cup-dashboard/backend/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Initialize Redis client
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Error("redis connection failed", "error", err)
		os.Exit(1)
	}
	logger.Info("redis connected", "addr", redisAddr)

	// All data comes from Polymarket Gamma API — no external API keys needed
	httpClient := &http.Client{Timeout: 10 * time.Second}

	yearRepo := repository.NewYearRepo(httpClient)
	matchRepo := repository.NewMatchRepo(httpClient)

	matchSvc := service.NewMatchService(yearRepo, matchRepo)
	yearSvc := service.NewYearService(matchSvc)

	h := handler.New(yearSvc, matchSvc, rdb, logger)
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
