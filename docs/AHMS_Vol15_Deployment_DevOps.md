# AHMS Volume 15 — Deployment & DevOps

> Complete production deployment and DevOps guide for the **Ayurvedic Hospital Management System (AHMS)**.
> This volume is the operational companion to Volumes 00–14. Where feature volumes describe *what* the system does, this volume describes *how to run it reliably in production*.

**Reference Stack**

| Tier       | Technology                                          |
|------------|-----------------------------------------------------|
| Backend    | Go 1.22 + Gin (GORM, golang-jwt/v5, godotenv)       |
| Frontend   | React 19 + Vite 8 (Tailwind 4, axios, react-router) |
| Database   | PostgreSQL 16                                       |
| Cache      | Redis 7 (caching, token blacklist, rate limiting)   |
| Web server | Nginx (reverse proxy + static serving + TLS)        |
| Container  | Docker + Docker Compose                            |
| CI/CD      | GitHub Actions                                     |

**Table of Contents**

1. [Architecture Overview](#1-architecture-overview)
2. [Docker Setup](#2-docker-setup)
3. [Nginx Configuration](#3-nginx-configuration)
4. [Redis Setup](#4-redis-setup)
5. [SSL/TLS](#5-ssltls)
6. [Backup & Restore](#6-backup--restore)
7. [Logging](#7-logging)
8. [Monitoring](#8-monitoring)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Environment Configuration](#10-environment-configuration)
11. [Production Checklist](#11-production-checklist)
12. [Rollback Procedure](#12-rollback-procedure)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Architecture Overview

### Production Topology

```
                        Internet
                           │
                           ▼
                   ┌───────────────┐
                   │  Nginx :443   │   TLS termination + reverse proxy
                   └───────┬───────┘
                           │              / ────────────────> Frontend (static files)
                    proxy_bypass          \ /api/v1/* ──────> Backend
                           │
             ┌─────────────┴─────────────┐
             │                            │
    ┌────────▼─────────┐        ┌────────▼──────────┐
    │  ahms-frontend   │        │   ahms-backend     │   Go/Gin API
    │  nginx serve SPA │        │   :8080            │
    └──────────────────┘        └────────┬──────────┘
                                         │
                             ┌───────────┴───────────┐
                             │                        │
                     ┌───────▼───────┐        ┌───────▼───────┐
                     │  PostgreSQL 16 │        │   Redis 7      │
                     │  ahms_postgres │        │   ahms_redis   │
                     └───────────────┘        └───────────────┘
```

### Production Topology Explanation

- **Single entry point (Nginx)** on ports `80`/`443`. All client traffic terminates here.
- **Static assets** (`/`) are served directly by Nginx from the built React SPA in `dist/`.
- **API traffic** (`/api/v1/*`) is reverse-proxied to the Gin backend on `:8080`.
- **PostgreSQL** stores all relational data (patients, appointments, EMR, pharmacy, billing, IPD, audit).
- **Redis** is used for cache, JWT refresh-token blacklisting, and rate limiting. It sits *behind* the backend and is never exposed publicly.

> **Why Nginx in front and not the backend directly?** Nginx handles TLS, compression, HTTP/2, static files, and rate limiting at the edge, offloading the Go binary from these concerns and centralizing security policy.

---

## 2. Docker Setup

### 2.1 Backend Dockerfile (`ahms-backend/Dockerfile`)

Multi-stage build with a `golang:1.22-alpine` builder and a minimal `alpine:3.19` runtime image. The runtime image contains only the compiled binary, CA certificates, and timezone data.

```dockerfile
# ─── Build stage ───
FROM golang:1.22-alpine AS builder

# ca-certificates + git needed by go mod download
RUN apk add --no-cache ca-certificates git

WORKDIR /app

# Cache dependencies separately for better layer caching
COPY go.mod go.sum* ./
RUN go mod download

# Copy source and build a static binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /ahms-backend ./cmd/api

# ─── Runtime stage ───
FROM alpine:3.19

# Runtime system essentials: TLS + timezone data.
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S ahms && adduser -S ahms -G ahms

WORKDIR /app
COPY --from=builder /ahms-backend /usr/local/bin/ahms-backend

# Run as non-root.
USER ahms

EXPOSE 8080

# Healthcheck so Docker Compose and orchestrators can verify liveness.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/v1/public/health || exit 1

ENTRYPOINT ["/usr/local/bin/ahms-backend"]
```

> **Note:** `-ldflags="-s -w"` strips debug symbols and shrinks the binary. The image is run as a
> non-root user (`ahms`) — a production security best practice.

### 2.2 Frontend Dockerfile (`ahms-frontend/Dockerfile`)

Multi-stage: build the React SPA with Node, then copy `dist/` into an Nginx image.

```dockerfile
# ─── Build stage ───
FROM node:20-alpine AS build

WORKDIR /app

# Cache node_modules across builds when package-lock.json is unchanged.
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source (use .dockerignore to keep it lean).
COPY . .
# tsc -b && vite build  (matches the package.json "build" script)
RUN npm run build

# ─── Runtime stage (Nginx) ───
FROM nginx:1.27-alpine

# Override default Nginx site.
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Built SPA.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/ || exit 1
```

> The SPA routes are handled client-side by React Router, so the Nginx config must include a
> `try_files ... /index.html` fallback (see Section 3).

### 2.3 `.dockerignore` (both projects)

```
# Go
ahms-backend:
.git
ahms.db
*.exe
bin/
.env
docs/

# Node
ahms-frontend:
node_modules
dist
*.log
.env
```

### 2.4 `docker-compose.yml` (full stack)

Compose brings up the whole system: database, cache, backend, frontend, and the edge Nginx.

```yaml
name: ahms

services:
  # ── Database ──────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: ahms_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-ahms}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-change-me}
      POSTGRES_DB: ${DB_NAME:-ahms}
    ports:
      - "127.0.0.1:5432:5432"   # bound to localhost only; never public
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backup:/backup          # shared dir for automated backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-ahms} -d ${DB_NAME:-ahms}"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks: [ahms-net]

  # ── Cache / Redis ─────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: ahms_redis
    restart: unless-stopped
    command: >
      redis-server --appendonly yes
                   --requirepass ${REDIS_PASSWORD:-change-me}
                   --maxmemory 256mb
                   --maxmemory-policy allkeys-lru
    ports:
      - "127.0.0.1:6379:6379"    # bound to localhost only
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-change-me}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [ahms-net]

  # ── Backend API ───────────────────────────────────────────
  backend:
    build:
      context: ./ahms-backend
      dockerfile: Dockerfile
    container_name: ahms_backend
    restart: unless-stopped
    env_file:
      - .env
    environment:
      APP_ENV: production
      DB_HOST: postgres
      DB_PORT: "5432"
      REDIS_ADDR: redis:6379
      REDIS_ENABLED: "true"
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    ports:
      - "127.0.0.1:8080:8080"    # reached via Nginx only, not exposed publicly
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks: [ahms-net]

  # ── Frontend (Nginx serving the SPA) ──────────────────────
  frontend:
    build:
      context: ./ahms-frontend
      dockerfile: Dockerfile
    container_name: ahms_frontend
    restart: unless-stopped
    networks: [ahms-net]

  # ── Edge Nginx (reverse proxy + TLS) ──────────────────────
  nginx:
    image: nginx:1.27-alpine
    container_name: ahms_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./deploy/ssl:/etc/nginx/ssl:ro
      - ./deploy/html:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend
    networks: [ahms-net]

volumes:
  pgdata:
  redisdata:

networks:
  ahms-net:
    driver: bridge
```

### 2.5 Environment Variables Configuration

Precedence in Compose: **process env → `.env` file → `env_file` → `environment:` block**.

- Put non-secret, non-changing defaults in `environment:`.
- Put secrets (passwords, JWT secret) in a `.env` file or better, an injected secret (Docker secrets / CI secrets).
- **Never commit `.env`** to version control.

### 2.6 Volumes (Persistable Data)

| Volume | Container path        | Holds                                    |
|--------|-----------------------|------------------------------------------|
| `pgdata`  | `/var/lib/postgresql/data` | Entire PostgreSQL data directory (all tables, rows, sequences) |
| `redisdata` | `/data`              | Redis snapshot (`dump.rdb`) + AOF log    |
| `./backup` | `/backup`          | Host mount for `pg_dump` archive files   |

> **Critical:** If you delete the `pgdata` volume you lose the entire database. Never `docker compose down -v`
> on production unless you intend to wipe data.

### 2.7 Healthchecks

Healthchecks are declared for `postgres`, `redis`, `backend`, and `frontend`. Compose uses
`condition: service_healthy` for ordering (`depends_on`) and orchestrators use them for
restart/readiness decisions. All should be implemented *and verified* with `docker compose ps` after boot.

---

## 3. Nginx Configuration

Place at `deploy/nginx.conf` (mapped into the edge `nginx` service) and also used, in simplified form,
inside the frontend image.

### 3.1 Full Reverse Proxy + SPA Nginx Config

```nginx
# /etc/nginx/conf.d/ahms.conf

log_format ahms '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" rt=$request_time';

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 80;
    server_name api.maitri-ayurveda.in;
    return 301 https://$host$request_uri;   # force HTTPS
}

server {
    listen 443 ssl http2;
    server_name api.maitri-ayurveda.in;

    # ── TLS (see Section 5) ──────────────────────────────
    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ── Security headers ─────────────────────────────────
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header X-Content-Type-Options    "nosniff"    always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-XSS-Protection          "1; mode=block" always;

    # ── Gzip (with gzip_static for precompressed assets) ──
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               application/xml font/woff2 image/svg+xml;
    gzip_static on;    # serve pre-existing .gz files (built by Vite/build)

    # ── Static frontend + SPA fallback ─────────────────────
    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;   # React Router fallback
    }

    # ── API reverse proxy ─────────────────────────────────
    location /api/v1/ {
        limit_req zone=api_limit burst=40 nodelay;

        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;
        proxy_send_timeout    60s;
    }

    # ── Tighter rate limit on auth endpoints ────────────────
    location = /api/v1/auth/login {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location = /api/v1/auth/refresh {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
    }

    # ── Health / uptime checks bypass rate limits ───────────
    location = /api/v1/public/health {
        access_log off;
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
    }

    # ── Error page ─────────────────────────────────────────
    error_page 502 503 504 /502.html;
    location = /502.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

### 3.2 Configuration Breakdown

- **Reverse proxy (`/api/v1/ → backend:8080`)** — forwards API traffic with correct headers so Gin
  sees the real client IP and protocol.
- **Static file serving** — root points at the built SPA; `/assets/` gets long-lived cache headers;
  `try_files ... /index.html` gives the SPA client-side routing.
- **SSL/TLS termination** — Nginx does the TLS handshake, backend stays plain HTTP inside the container.
- **Gzip compression** — on for text/json/js; `gzip_static` serves `.gz` files built by Vite.
- **HTTP/2** — `http2` on the 443 server block.
- **Rate limiting** — `limit_req_zone` zones; the API zone is broad (20 r/s), auth zone is strict
  (5 r/s) to slow brute-force on login.
- **Security headers** — HSTS, X-Frame-Options, X-Content-Type-Options, etc.

---

## 4. Redis Setup

Redis is used for three production concerns and is password-protected and bound to localhost only.

### 4.1 Roles in AHMS

1. **Cache** — query results (e.g. frequently requested public doctor listings), rate-limit counters.
2. **Token blacklist** — refresh tokens invalidated on logout are written to Redis with a TTL equal
   to the token's remaining lifetime, so revoked tokens are rejected even after expiry of the in-memory JTI set.
3. **Rate-limiting** — sliding/window counters keyed by IP or user id.

### 4.2 Cache Configuration

Redis is configured in compose with:

```
--maxmemory 256mb --maxmemory-policy allkeys-lru
```

- `maxmemory` caps Redis at 256 MB.
- `allkeys-lru` evicts least-recently-used keys when memory is exhausted — appropriate for a cache
  where losing any key is safe.
- AOF (`appendonly` default via the image) is persisted to `redisdata` for cache warm-start.

### 4.3 Session / Token-Blacklist Storage

Key pattern: `blacklist:user:<userID>:jti=<jti>` with `SET key 1 EX 168h`. On every authenticated
request, the backend consults Redis first; a present key means "token revoked."

```text
KEY                                      TTL
-----------------------------------------------
tl:user:3fa8-…:jti=abc123                168h
cache:public:doctors                     60s
rl:login:203.0.113.5                     60s count
```

### 4.4 Rate Limiting

Use a fixed-window script via Lua for atomic increments:

```lua
-- scripts/rate_limit.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end
if current > limit then
    return 0
end
return limit - current
```

### 4.5 Password-Protected Redis

Compose command includes `--requirepass ${REDIS_PASSWORD}`. Backend connects with
`REDIS_ADDR=redis:6379` and `REDIS_PASSWORD=<secret>` (see `config.go`):
`REDIS_PASSWORD` maps to `cfg.RedisPassword`. The port is bound to `127.0.0.1` only so it is not
reachable from the public internet even if the firewall is misconfigured.

---

## 5. SSL/TLS

### 5.1 Let's Encrypt via certbot

On the host (or an `certbot` sidecar), obtain certs for the domain(s):

```bash
sudo apt update && sudo apt install -y certbot nginx  # nginx plugin

sudo certbot certonly --nginx -d api.maitri-ayurveda.in \
  --email ops@maitri-ayurveda.in --agree-tos --no-eff-email -v
```

Certificates are written to:

```
/etc/letsencrypt/live/api.maitri-ayurveda.in/
    ├── fullchain.pem      # server cert + intermediates (used by Nginx)
    ├── privkey.pem        # private key (used by Nginx)
    └── chain.pem          # CAUSes intermediates only
```

Nginx references `/etc/letsencrypt/live/<domain>/fullchain.pem` and `privkey.pem`. If certs are kept on
the host and Nginx runs in a container, mount them read-only:

```yaml
volumes:
  - /etc/letsencrypt:/etc/nginx/ssl:ro
```

### 5.2 Auto-Renewal Cron

Certbot certs expire after 90 days. Renew automatically twice daily then reload Nginx:

```bash
# /etc/cron.d/certbot
0 0,12 * * * root certbot renew --quiet --deploy-hook "nginx -s reload"
```

Or as a systemd timer (`certbot-renew.service` / `certbot-renew.timer`):

```ini
# /etc/systemd/system/certbot-renew.timer
[Timer]
OnCalendar=*-*-* 00,12:00:00
Persistent=true
```

Then `sudo systemctl enable --now certbot-renew.timer`.

> If certbot runs inside a container, mount `/etc/letsencrypt` as a shared volume and have the cron
> task restart/reload the Nginx container on success.

### 5.3 Key Generation for JWT Signing

The AHMS backend requires `JWT_SECRET` ≥ 32 characters (`config.go` errors otherwise). Generate a
strong random secret with:

```bash
openssl rand -base64 48
# or
openssl rand -hex 32
```

Store it in the `.env` / secrets manager used by the backend container. Never hard-code it or commit it.

---

## 6. Backup & Restore

### 6.1 PostgreSQL `pg_dump` Backups

`pg_dump` produces a portable SQL/compressed archive that can be restored into a fresh instance
(no filesystem/version coupling).

```
pg_dump -h localhost -U ahms -d ahms --format=custom --file=/backup/ahms_$(date +%F_%H%M).dump
```

### 6.2 Automated Backup Script

Backup daily via cron on the host (or a scheduled job). Script at `deploy/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-ahms}"
DB_USER="${DB_USER:-ahms}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M%S)"
FILE="$BACKUP_DIR/ahms_${STAMP}.dump"

# Custom-format dump (restorable + compressible).
pg_dump -Fc -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -f "$FILE"
echo "backup: created $FILE"

# Rotate old backups.
find "$BACKUP_DIR" -name 'ahms_*.dump' -mtime +"$KEEP_DAYS" -delete
echo "backup: rotated backups older than ${KEEP_DAYS} days"
```

Cron entry (daily at 2am heavy):

```bash
0 2 * * * root /opt/ahms/deploy/backup.sh >> /var/log/ahms-backup.log 2>&1
```

**Belt-and-suspenders:** copy the dump elsewhere off-box (S3/Object storage, second disk, rsync) so a
single host failure cannot destroy both data and backup.

### 6.3 Backup Retention Policy

| Frequency | Retention | Format                  |
|-----------|-----------|-------------------------|
| Daily     | 14 days   | `pg_dump` custom archive  |
| Weekly    | 8 weeks   | 1 x weekly archive       |
| Monthly  | 12 months  | archival archive to cold storage |

### 6.4 Restore Procedure

To restore from a custom-format dump into a fresh database:

```bash
# 1. Point DATABASE at the new/emptied instance (or create the DB):
createdb -h 127.0.0.1 -U ahms ahms_restore

# 2. Restore the archive (run repeatedly with --jobs and --no-owner as needed):
pg_restore -h 127.0.0.1 -U ahms --no-owner --dbname=ahms_restore \
  -j 4 /backup/ahms_20260805_0300.dump

# 3. Point the backend at the restored DB, restart, and smoke-test.
```

Test restores regularly by restoring into a scratch database and running a `SELECT count(*) FROM users;`
sanity check. A backup you never restore is untested.

### 6.5 Database Replication (Master–Slave)

For high availability / read-scaling, PostgreSQL physical streaming replication:

```
master (ahms_postgres) ── streaming ──► standby ──╮
  primary: published            receive (read-only) │
                                                     ├─ hot standby can promote on master failure
```
- Configure `wal_level = replica`, `max_wal_senders`, `hot_standby = on` on the primary.
- Standby connects via `pg_basebackup` and streams WAL.
- Failover can be automated with Patroni or a manual `pg_ctl promote`.
- **Caveat:** streaming standby is a continuous restore of WAL, not a point-in-time backup — keep
  daily `pg_dump` snapshots regardless.

---

## 7. Logging

### 7.1 Application Log Format

The Go/Gin backend logs structured-ish key-value lines. Standardize on UTC timestamps:

```
{"time":"2026-08-05T07:00:00Z","level":"INFO","method":"GET","path":"/api/v1/public/doctors","status":200,"duration_ms":12,"client_ip":"203.0.113.9"}
{"time":"2026-08-05T07:00:03Z","level":"ERROR","method":"POST","path":"/api/v1/auth/login","status":401,"duration_ms":41,"message":"invalid credentials"}
```

Recommended fields: `time`, `level`, `module`, `method`, `path`, `status`, `duration_ms`, `request_id`,
`message`, `error`. Correlate across services with a `request_id`/`X-Request-ID` header.

### 7.2 Nginx Access / Error Logs

```nginx
access_log /var/log/nginx/ahms_access.log ahms;
error_log  /var/log/nginx/ahms_error.log warn;
```

Format captures response time and client info for latency/SLO analysis (see `log_format main` in §3).

### 7.3 Log Rotation

Use `logrotate` (host) or Docker's `json-file` log driver with limits:

```yaml
logging:
  driver: json-file
  options:
    max-size: "50m"
    max-file: "5"
```

Host `logrotate` for container-less logs:

```bash
# /etc/logrotate.d/ahms
/var/log/nginx/ahms_*.log /var/log/ahms-backup.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### 7.4 Distributed Logging

- **Option A (simple, recommended start):** retain JSON logs per container with rotation (above).
- **Option B (ELK stack):** ship with a lightweight forwarder (Filebeat) → Logstash → Elasticsearch →
  Kibana for central search and dashboards. Use at scale.

### 7.5 Log Levels

| Level | Use                                                         |
|-------|-------------------------------------------------------------|
| DEBUG | Development only; request bodies, SQL queries.              |
| INFO  | Standard operational activity (auth success, cache miss).  |
| WARN  | Recoverable issues (slow query, retry, rate-limit hit).     |
| ERROR | Failures needing attention (DB down, token invalid).       |
| FATAL | Unrecoverable (process abort, config invalid).             |

Gate DEBUG behind `APP_ENV=development`; production ships INFO+ by default.

---

## 8. Monitoring

### 8.1 Prometheus Setup

Add a Prometheus service (exporter is host-scoped; the API exposes metrics at `/metrics`).

```yaml
# docker-compose monitoring override: prometheus.yml
scrape_configs:
  - job_name: 'ahms_backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: /metrics

  - job_name: 'node'
    static_configs:
      - targets: ['node_exporter:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres_exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis_exporter:9121']
```

Prometheus scrape interval: `15s`. Launch via a `prometheus:` service with the above mounted config.

### 8.2 Grafana Dashboards

Connect Grafana ("localhost" server) to Prometheus and import dashboard JSONs for:
- **Go/Gin** — request rate, latency (histograms), errors, active requests.
- **Node** — CPU, memory, disk, network.
- **PostgreSQL** — active connections, idle, cache hit ratio, WAL activity.
- **Redis** — memory, evictions, hit rate, connected clients.

Key panels: REQUEST-RATE, p95 LATENCY, ERROR-RATE, DB CONNECTIONS, MEMORY, DISK USAGE.

### 8.3 Key Metrics to Monitor

| Metric                         | Alert threshold (indicative)          |
|--------------------------------|----------------------------------------|
| API p95 latency                | > 500 ms over 10 min                  |
| API error rate (5xx)          | > 1% over 5 min                       |
| HTTP 5xx count                | > 0 sustained for 5 min               |
| DB active connections         | > 80% of pool max                    |
| DB idle-in-transaction        | > 5 sustained                         |
| Memory utilization            | > 85%                                 |
| Disk usage                    | > 85%                                 |
| Redis memory                  | > 80% of maxmemory                   |
| 99th percentile queue depth    | rising                                   |

### 8.4 Healthcheck Endpoints

- Public unauthenticated health:Live endpoint `/api/v1/public/health` (also Nginx bypassed).
- Readiness (DB + Redis) may be exposed on `/healthz/ready`.
- Liveness: `/healthz/live` returns when process up (used by Docker HEALTHCHECK).

### 8.5 Alerting Rules (Prometheus)

```yaml
groups:
  - name: ahms-alerts
    rules:
      - alert: BackendDown
        expr: up{job="ahms_backend"} == 0
        for: 1m
        annotations: { summary: "AHMS backend is down" }
      - alert: HighAPIRate
        expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 0.01
        for: 5m
        annotations: { summary: ">1% API errors detritLed" }
      - alert: DBConnectionsHigh
        expr: (pg_pool_active / pg_pool_max) > 0.8
        for: 10m
        annotations: { summary: "DB connection pool near limit" }
      - alert: DiskNearlyFull
        expr: (node_filesystem_avail / node_filesystem_size) < 0.15
        for: 15m
        annotations: { summary: "Disk usage above 85%" }
```

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Stages: **lint → test → build backend → build frontend → docker build → deploy**.

```yaml
name: AHMS CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ahms-${{ github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/your-org/ahms

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: 1.22 }
      - name: Lint (gofmt/golangci check)
        run: |
          test -z "$(gofmt -l .)" 
          go vet ./...
      - working-directory: ahms-backend
        run: go vet ./... && gofmt -l .

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: ahms, POSTGRES_PASSWORD: test, POSTGRES_DB: ahms_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U ahms" --health-reestablish
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: 1.22 }
      - working-directory: ahms-backend
        run: |
          go build ./...
          go test ./... -race -count=1

  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - working-directory: ahms-frontend
        run: |
          npm ci
          npm run lint

  build-images:
    needs: [lint-backend, test-backend, lint-frontend]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build & push backend
        uses: docker/build-push-action@v5
        with:
          context: ./ahms-backend
          push: true
          tags: "${{ env.IMAGE_PREFIX }}-backend:main,${{ env.IMAGE_PREFIX }}-backend:${{ github.sha }}"
      - name: Build & push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./ahms-frontend
          push: true
          tags: "${{ env.IMAGE_PREFIX }}-frontend:main,${{ env.IMAGE_PREFIX }}-frontend:${{ github.sha }}"

  deploy:
    needs: build-push
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/ahms
            export VERSION=${{ github.sha }}
            docker compose pull
            docker compose up -d --no-deps backend frontend
            docker image prune -f
```

### 9.2 Environment-Specific Config

Use the same Dockerfile for all environments; inject difference via config/env:

| Env         | Branch  | APP_ENV  | DB_SSL_MODE | Redis cache | ALLOWED_ORIGINS       |
|-------------|---------|----------|-------------|-------------|------------------------|
| development | local  | development | disable | enabled | `http://localhost:5173` |
| staging     | develop | staging    | require | enabled | `https://staging.…`     |
| production  | main  | production  | require | enabled | `https://maitri-ayurveda.in` |

### 9.3 Automated Deployment to Server

- The `deploy` job SSHes to the host, logs into GHCR, `pull`s the images tagged by git SHA, and
  restarts with `docker compose up -d`.
- The steps above are sequential with guard conditions on branch + event.

---

## 10. Environment Configuration

### 10.1 `.env.example` (backend — mirrors `ahms-backend/.env.example`)

```env
# ── Environment ─────────────────────────────
APP_ENV=development          # development | staging | production
SERVER_PORT=8080

# ── PostgreSQL ─────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USER=ahms
DB_PASSWORD=change-me
DB_NAME=ahms
DB_SSL_MODE=disable        # production: require/verify-full

# ── Redis ──────────────────────────────────
REDIS_ENABLED=true
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=change-me

# ── JWT (secret must be ≥ 32 chars) ─────────
JWT_SECRET=replace-with-openssl-rand-base64-48
JWT_ACCESS_TOKEN_TTL_MINUTES=60
JWT_REFRESH_TOKEN_TTL_HOURS=168

# ── CORS ──────────────────────────────────────
ALLOWED_ORIGINS=https://maitri-ayurveda.in

# ── Bootstrap super-admin (first-run only) ────
SEED_SUPER_ADMIN_EMAIL=admin@ahms.local
SEED_SUPER_ADMIN_MOBILE=9999999999
SEED_SUPER_ADMIN_PASSWORD=ChangeMe123!
SEED_DEMO_DEPARTMENTS=false
```

`.env.example` for frontend (`ahms-frontend/.env.example`, used at build time for e.g. public config):

```env
# Injected at build time only for non-sensitive, non-VITE_ values you accept public exposure.
VITE_API_BASE_URL=/api/v1
```

*(The current frontend uses a hard-coded relative `/api/v1` base URL in `src/lib/api.ts`; if you
externalize it, use a `VITE_`-prefixed var here.)*

### 10.2 Environment Variables — All Modules

| Module            | Variables (sample)                                             |
|-------------------|----------------------------------------------------------------|
| **Config**        | `APP_ENV`, `SERVER_PORT`                                       |
| **Database**      | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE` |
| **Redis**         | `REDIS_ENABLED`, `REDIS_ADDR`, `REDIS_PASSWORD`                |
| **Auth / JWT**    | `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL_MINUTES`, `JWT_REFRESH_TOKEN_TTL_HOURS` |
| **CORS**          | `ALLOWED_ORIGINS` (comma-separated)                            |
| **Seed/first-run**| `SEED_SUPER_ADMIN_*`, `SEED_DEMO_DEPARTMENTS`                  |
| **Frontend**      | `VITE_*` (only, build-time)                                     |

### 10.3 Secrets Management

- Never store JWT secret or DB password in code or git.
- Use the platform's secret store. For Compose: Docker secrets or a dedicated `.env` (gitignored);
  for k8s: a `Secret` object or KCI.
- Rotate `JWT_SECRET` only with a disciplined rollout — rotation invalidates all sessions; plan brief
  maintenance or dual-key signing if tokens must survive.
- Enforce least privilege: each service gets only the vars it needs.

---

## 11. Production Checklist

### 11.1 Security Checklist

- [x] SSH the host: `PermitRootLogin no`, key auth only (disable password auth).
- [x] Firewall (ufw/firewalld): allow only `22`, `80`, `443`; deny `5432`/`6379` publicly.
- [x] Containers bind `5432`/`6379`/`8080` to `127.0.0.1`.
- [x] HTTPS enabled with valid certs + HSTS + cert auto-renewal.
- [x] `JWT_SECRET` ≥ 32 chars, generated with `openssl rand`, stored in a secret manager.
- [x] Redis password required, port not public.
- [x] Rate limiting on auth + API applied at Nginx edge.
- [x] Backend runs as non-root user in the container.
- [x] `.env`/secrets excluded from git (gitignore verified).

### 11.2 Performance Checklist

- [x] Gzip + `gzip_static` enabled; static assets immutable-cached.
- [x] HTTP/2 enabled on 443.
- [x] Connection-pool capping tuned for PG (prevent exhaustion, see §13.3).
- [x] Redis cache warm for read-heavy public endpoints (doctors, departments).
- [x] Load tested `/api/v1/patients` and `/api/v1/appointments` under peak load.

### 11.3 High Availability Considerations

- At least 2 application instances behind Nginx (upstream healthy-group).
- PostgreSQL streaming standby (§6.5) + automated promotion (Patroni).
- State is centralized in PG/Redis (so app instances are stateless).
- Certbot/Let's Encrypt renewal automated.

### 11.4 Disaster Recovery

- Daily + weekly + monthly backups, off-site copy (§6).
- Document RPO (≤ 30 min) and RTO (≤ 4 h).
- Test restore quarterly into a scratch DB.
- Playbooks: full host rebuild from base image.

### 11.5 Scaling Strategy

- **Vertical** first: bigger PG box, more memory for Redis.
- **Horizontal API** at Nginx/LB: add backend instances (stateless).
- **Read scaling:** streaming replica for reporting/analytics reads.
- **Cache scaling:** move to Redis Cluster when single-instance memory limits hit.

---

## 12. Rollback Procedure

### 12.1 Version Tagging

Tag images with the git SHA and release tag:

```
ghcr.io/your-org/ahms-backend:27a4f1c  (or :1.4.2)
ghcr.io/your-org/ahms-frontend:27a4f1c
```

Compile a migration changelog so schema rollbacks are possible.

### 12.2 Application Rollback

If the new version is bad:

```bash
cd /opt/ahms
docker compose logs backend --tail=50        # confirm the incident
docker compose up -d backend frontend       # redeploy…
# …but point at the previous tag:
export VERSION=27a4f1a                       # previous good SHA
# Alternatively pin image tag explicitly:
sed -i 's|ghcr.io/your-org/ahms-backend:.*|ghcr.io/your-org/ahms-backend:27a4f1c|' docker-compose.yml
docker compose up -d --no-deps backend frontend
docker compose ps                            # verify healthy
```

Keep the working copy of the compose file tagged to main, and use overrides/env-swaps to pin.

### 12.3 Database Rollback

**Before/after schema strategy** — every migration has a companion "downgrade".

- Keep a schema snapshot per release (`schema_20260805.sql`).
- For temporary hotfix below, take `pg_dump` before running new migration.
- If the new schema breaks: restore the previous dump to – l, allowing only the app to issue the rollback.

```bash
# 1. Mark current app version / note migration.
# 2. Restore the last-good snapshot:
pg_restore -h 127.0.0.1 -U ahms --clean --if-exists --dbname=ahms /backup/ahms_before_20260805.dump
# 3. Point app at it and restart.
```

> Best practice: migrate data *forward-compatibly* — write migrations that can return to the prior
> state, and test the downgrade path. Never delete data outright while old app may still run.

---

## 13. Troubleshooting

### 13.1 Connection Refused (Nginx → Backend / App → DB)

```
dial tcp 127.0.0.1:8080: connect: connection refused
```

- Confirm the backend is `docker compose ps` (`Up`).
- Check `proxy_pass http://backend:8080` target matches the service name/port.
- Backend `SERVER_PORT` must equal the container-exposed 8080.
- Network: `docker network inspect ahms-net` — services must share `ahms-net`.

### 13.2 404 / SPA routes broken (Nginx)

- Caused by missing `try_files ... /index.html` fallback.
- Add the location `/ { try_files $uri $uri/ /index.html; }` from §3.

### 13.3 Database connection-pool exhaustion

- Symptoms: `sorry, too many open connections`, `connection refused: pq: ...`.
- `gorm` default pool may exceed PG `max_connections` under load.
- Cap Go `SetMaxOpenConns`; set PG `max_connections` higher; watch `monitoring` (§8).
- Add connection pooling at the proxy (PgBouncer) for large concurrency.

### 13.4 CORS issues

- Symptom: browser `blocked by CORS policy`.
- Ensure `ALLOWED_ORIGINS` includes the exact origin the browser loads (scheme + host + port).
- If the app sits behind Nginx, proxy must pass same-origin and the browser uses that origin.
- Check credentials usage; if `withCredentials` required, add `AllowCredentials`.

### 13.5 SSL certificate expiry

- Symptoms: browsers report "certificate has expired"; Nginx fails to start / reload on expired PEM.
- Verify: `echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates`.
- Confirm the certbot renewal cron persists and Nginx reloads after renewal (§5.2).

### 13.6 Other FAQ

- **Ports 80/443 already in use** — bind Nginx only, direct-download others internally.
- **`jwt-secret` validation failure** — config error; set `JWT_SECRET` ≥ 32 chars (config.go).
- **Redis not applied** — check `REDIS_ENABLED=true` and `REDIS_ADDR/redis:6379`, and that `REDIS_PASSWORD` matches.
- **Slow first request** after deploy — cold caches; warm public endpoints.

---

## Appendix: File Index

```
ahms-backend/
  Dockerfile                     Backend multi-stage build (build/run)
  docker-compose.yml             Full stack (postgres, redis, backend) OR stack root
  .env / .env.example            Config (volume covers documented vars)
ahms-frontend/
  Dockerfile                     Multi-stage build + nginx serve
  nginx.conf                     SPA-serving Nginx config for the frontend image
  .env.example.front
deploy/
  nginx.conf                    Reverse proxy + TLS + SPA (edge Nginx)
  backup.sh                    Automated pg_dump + rotation
  prometheus.yml              Prometheus scrape config
  .env.production              Production secrets (gitignored)
.github/
  workflows/deploy.yml         CI/CD pipeline
docs/
  AHMS_Vol15_Deployment_DevOps.md   ← this guide
```

---

*© AHMS DevOps. This volume is part of the AHMS Enterprise UI Development Bible (Vols 00–15).*