# --- Build stage ---
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /ahms-backend ./cmd/api

# --- Run stage (non-root) ---
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata su-exec

RUN adduser -D -H -u 10001 ahms && \
    mkdir -p /app/uploads && \
    chown -R ahms:ahms /app/uploads

WORKDIR /app
COPY --from=builder /ahms-backend .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080

# Ensure the writable uploads volume is owned by the app user at boot, then
# drop from root to the unprivileged ahms user for the lifetime of the app.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
