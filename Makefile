.PHONY: build up down logs test dev backend frontend restart ps clean

# === Docker Compose ===

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart: build down up

ps:
	docker compose ps

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

# === Development (local, no Docker) ===

dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npx vite

dev: dev-backend dev-frontend

# === Testing ===

test-backend:
	cd backend && go test ./... -count=1

test-backend-v:
	cd backend && go test ./... -v -count=1

test-frontend:
	cd frontend && npx vitest run

test: test-backend test-frontend

# === Build (local) ===

build-backend:
	cd backend && go build ./...

build-frontend:
	cd frontend && npx vite build

build-local: build-backend build-frontend

# === Docker image builds (alias) ===

docker-build-backend:
	docker compose build backend

docker-build-frontend:
	docker compose build frontend

docker-build: docker-build-backend docker-build-frontend

# === Clean ===

clean:
	docker compose down --volumes --remove-orphans 2>/dev/null || true
	rm -rf frontend/dist
