// Package middleware provides HTTP middleware for the World Cup dashboard API.
package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// CORS returns a middleware that sets CORS headers for the frontend origin.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logger returns a middleware that logs each request with method, path, status, and duration.
func Logger(logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap ResponseWriter to capture status code
			lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(lrw, r)

			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", lrw.statusCode,
				"duration", time.Since(start).String(),
			)
		})
	}
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}
