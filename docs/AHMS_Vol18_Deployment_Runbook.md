# AHMS Vol18 — Deployment Runbook (operational)

> Step-by-step operating guide for the **actual production artifacts** in this repo.
> Deep-dive architecture is in Vol15 (`AHMS_Vol15_Deployment_DevOps.md`). This volume is the
> command-by-command runbook for first deploy, upgrades, backups, and rollback.

**Topology in one line:** `Client → Caddy (TLS) :443 → nginx (SPA + /api proxy) → Go backend :8080 → PostgreSQL 16 + Redis 7` (all in Docker, isolated network).

**Key files**

| File | Purpose |
|------|---------|
| `ahms-backend/docker-compose.prod.yml` | Production stack (5 services) |
| `ahms-backend/Caddyfile.prod` | Caddy TLS reverse proxy config |
| `ahms-backend/.env.production.example` | Production env template (copy → `.env.production`) |
| `ahms-backend/Dockerfile` | Backend image (multi-stage) |
| `ahms-frontend/Dockerfile.prod` | Frontend image (build + nginx) |
| `ahms-frontend/nginx.conf` | SPA serving, `/api` proxy, CSP/security headers |

---

## 1. Server prerequisites

- Docker Engine + Docker Compose v2 (`docker compose version`)
- DNS: `A` record for your domain (e.g. `app.ahms-hospital.com`) → server public IP
- Open ports **80** and **443** in the firewall
- Linux host recommended (this repo was developed on Windows/WSL2 — commands below are OS-agnostic `docker compose`)

## 2. Prepare configuration

```bash
cd ahms-backend
cp .env.production.example .env.production
# EDIT .env.production — generate REAL secrets:
openssl rand -base64 48        # JWT_SECRET  (≥32 chars, enforced by the backend)
openssl rand -base64 32        # DB_PASSWORD
openssl rand -base64 32        # REDIS_PASSWORD
```
- Set `ALLOWED_ORIGINS=https://your-real-domain` (exactly the frontend HTTPS origin).
- Set `TRUSTED_PROXIES` to your proxy subnets; defaults cover Docker private ranges.
- **Never commit `.env.production`** (add to `.gitignore`).

## 3. First deploy

```bash
# From ahms-backend/ (where docker-compose.prod.yml lives)
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Caddy automatically obtains + renews a Let's Encrypt certificate for the domain in `Caddyfile.prod` (no manual cert steps).

## 4. Verify the deployment

```bash
docker compose -f docker-compose.prod.yml ps            # all 5 services healthy
curl -s https://your-domain/health                      # {"status":"up",...}
curl -sI https://your-domain/ | grep -i content-security-policy   # SPA CSP present
curl -sI https://your-domain/ | grep -i strict-transport-security # HSTS present
curl -s https://your-domain/api/v1/public/doctors       # public API via Caddy+nginx
```
Then log in to the admin panel and confirm data reads (dashboard counts, patient list).

## 5. Upgrades & versioned images

Tag images so every release is reproducible and rollbackable:

```bash
export TAG=v1.0.1
docker compose --env-file .env.production -f docker-compose.prod.yml build backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml build backend
docker tag ahms-backend-backend:latest ahms-backend-backend:$TAG
docker tag ahms-frontend:latest ahms-frontend:$TAG

# Deploy that exact version (compose pulls the tag via BACKEND_TAG env var)
BACKEND_TAG=$TAG docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```
Upgrade a single service (zero-downtime path: pull/build then `up -d`):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend
```
> Backend schema changes are handled by GORM `AutoMigrate` at startup (see `internal/database`). Take a DB backup (step 6) before any upgrade.

## 6. Backup & restore

```bash
# Backup (run inside the postgres container)
docker exec ahms_prod_postgres pg_dump -U $DB_USER $DB_NAME > ahms_backup_$(date +%F).sql

# Restore (into a fresh/emptied DB)
docker exec -i ahms_prod_postgres psql -U $DB_USER -d $DB_NAME < ahms_backup_2026-08-06.sql
```
Automate: cron nightly dump → off-site storage. Verify backups by a quarterly restore drill.

## 7. Rollback

```bash
# Re-point the running stack at the previous tagged image
BACKEND_TAG=v1.0.0 docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```
If a DB migration broke things, restore the pre-upgrade dump (step 6) **before** rolling the app image back.

## 8. Logs & troubleshooting

```bash
docker compose -f docker-compose.prod.yml logs -f backend      # API logs
docker compose -f docker-compose.prod.yml logs -f caddy        # TLS/proxy logs
docker compose -f docker-compose.prod.yml logs -f frontend     # nginx access/error

# Common issues
# - Caddy can't issue cert → check DNS A record + port 80 reachable
# - 429 "too many requests" for everyone → TRUSTED_PROXIES missing (real IP not seen)
# - nginx "host not found in upstream backend" → wait; resolver (127.0.0.11) retries per request
# - Login fails on fresh deploy → run migrations? No — check SEED_SUPER_ADMIN_* in .env.production
```

## 9. Production security reminders (see Vol17)

- Rotate the bootstrap **super-admin password** on first login.
- Keep `TRUSTED_PROXIES` as narrow as your topology allows.
- Never expose postgres/redis ports on the host (compose already uses `expose`, not `ports`).
- Frontend tokens live in `localStorage` (Vol17 §3.3) — plan cookie/rotation migration.
- Monitor rate-limit hits and failed-login bursts.

## 10. Go-live checklist

- [ ] Real secrets in `.env.production`, file git-ignored
- [ ] Domain resolves, ports 80/443 open
- [ ] HTTPS works, cert auto-renews (Caddy)
- [ ] `/health` + public + admin + portal all verified over HTTPS
- [ ] Super-admin password rotated
- [ ] Nightly DB backup automated + tested restore
- [ ] `TRUSTED_PROXIES` set (per-user rate limiting verified)
- [ ] CSP + HSTS headers confirmed on the SPA
- [ ] Tagged images for this release archived (`ahms-backend-backend:v1.0.0`, `ahms-frontend:v1.0.0`)