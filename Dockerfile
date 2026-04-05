# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Stage 2: Build Go backend ────────────────────────────────────────────────
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /srvmon .

# ── Stage 3: Final image ──────────────────────────────────────────────────────
FROM alpine:3.19
RUN apk add --no-cache ca-certificates docker-cli tzdata

WORKDIR /app
COPY --from=backend-builder /srvmon /app/srvmon
COPY --from=frontend-builder /app/frontend/dist /app/static

EXPOSE 8000
CMD ["/app/srvmon"]
