# AHMS Vol17 — Security Review & Hardening

**Date:** 06-Aug-2026
**Scope:** `ahms-backend` (Go/Gin/GORM/PostgreSQL/Redis) + `ahms-frontend` (React 19/Vite)
**Methodology:** Static source audit of auth, RBAC, transport, data-layer, and secrets; cross-checked against the production Docker topology (Caddy → nginx → backend).

---

## 1. Executive Summary

The application has a **strong baseline security posture**: bcrypt password hashing (cost 12), algorithm-pinned JWT with short access TTLs, role-based access control enforced server-side, allow-list CORS, production-only HSTS/CSP, rate-limited login, token-blacklist logout, Swagger disabled in production, and parameterized SQL throughout. No critical vulnerabilities found.

During this review, **two real production defects** were identified and fixed:

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | **High** | Reverse-proxy `ClientIP()` mis-detection breaks per-user rate limiting & audit IPs in the production topology | ✅ Fixed (trusted proxies) |
| 2 | **Medium** | SPA HTML served by nginx has **no CSP** (backend CSP only applies to JSON responses) | ✅ Fixed (nginx CSP) |

---

## 2. Verified Controls (evidence)

| Control | Mechanism | Evidence |
|---------|-----------|----------|
| Password hashing | bcrypt **cost 12** | `internal/utils/password.go:8` |
| JWT algorithm pinned | Signing method strictly HMAC on parse | `internal/utils/jwt.go:71,79` |
| JWT TTLs | Access 60 min / Refresh 168 h (7 d) | `internal/config/config.go:64-68` |
| Refresh misuse | `token_type` claim ("access" vs "refresh") checked on use | `internal/utils/jwt.go:22`; `internal/auth/service.go:58` |
| Logout invalidation | Access token blacklisted for 60 min | `auth/service.go:70-72`; `middleware/blacklist.go` |
| Login brute-force | Rate limit **10 req/min/IP** on `/auth/*` + portal | `cmd/api/main.go:93-94,222`; `auth/routes.go:25-26` |
| User enumeration | Identical generic error for unknown email or wrong password | `internal/auth/service.go:16` |
| RBAC | Server-side permission check via `role_permissions` join (e.g., Consultation/Prescription = DOCTOR) | `middleware/permission.go`; `main.go:116` |
| SQL injection | All queries parameterized (`?` placeholders, GORM/`db.Raw`) | `cmd/api/main.go:239,250,261` |
| CORS | Allow-list origins + credentials; no wildcard | `middleware/cors.go` |
| Security headers | nosniff, X-Frame-Options DENY, Referrer-Policy, Cache-Control no-store; **HSTS + CSP in prod** | `middleware/security.go:11-26` |
| Swagger exposure | Returns 404 in production | `middleware/security.go:37-44`; `main.go:100` |
| Request size | 10 MB body limit | `cmd/api/main.go:89` |
| Gin mode | Release mode in production (no debug) | `cmd/api/main.go:81-83` |
| Secrets min length | `JWT_SECRET` required, **≥ 32 chars** enforced | `internal/config/config.go:73-78` |
| Edge TLS | Caddy Auto-HTTPS (Let's Encrypt) + HSTS at the edge | `Caddyfile.prod` |
| Audit trail | Audit logs written to DB (200 logs observed) | `main.go:116`; `internal/audit` |

---

## 3. Findings & Recommendations

### 3.1 [FIXED — HIGH] Trusted proxies not configured
**Before:** In the production topology `Client → Caddy → nginx → backend`, `c.ClientIP()` returned the nginx container IP for **every** request, because the proxy hops were not trusted. Consequence:
- Login rate limiter became **global** (one user's 11th attempt throttled everyone).
- Audit logs recorded the proxy IP, not the real user IP.

**Fix applied:** Backend now reads `TRUSTED_PROXIES` (comma-separated CIDRs) and calls `router.SetTrustedProxies(...)`, with a loopback-only default. See `cmd/api/main.go` and `.env.production.example:.env`.

**Operations note:** Keep this list as narrow as possible (only your internal proxy CIDRs).

### 3.2 [FIXED — MEDIUM] No CSP on the SPA HTML document
**Critical:** CSP/security headers were set on **API responses only**. They do *not* protect the `index.html` served by nginx/Caddy, so the actual React app had **no Content-Security-Policy**. (HSTS from API responses is honored by browsers, but CSP is not.)
**Fix applied:** nginx now emits a CSP tailored to the app's real needs — Google Fonts stylesheets/fonts, inline style attributes (React `style={}`), `data:` favicon, Google Maps embed.
See `ahms-frontend/nginx.conf`.

### 3.3 [MEDIUM] Tokens stored in `localStorage` on the frontend
`src/lib/api.ts:34-175` stores access + refresh tokens and portal tokens in `localStorage`. Any XSS (e.g. injected content in Blog/Research, or a compromised third-party) can exfiltrate them.
**Recommendation:** migrate to **HttpOnly + Secure + SameSite cookies** served by the backend, or keep tokens in in-memory (won't survive refresh) combined with **refresh-token rotation**. Until then, keep CSP tight and prefer memory storage over `localStorage`.

### 3.4 [MEDIUM] Refresh tokens not rotated and not revocable on logout
- Logout only blocks the **access** token (60 min). The refresh token remains valid for up to **7 days**.
- No refresh-token rotation/versioning; a stolen refresh token is usable until expiry.
**Recommendation:** persist a per-user token version/`jti` in Redis, rotate on every `/refresh`, and revoke on logout.

### 3.5 [MEDIUM] Rate limiter & blacklist are in-memory (single-instance)
`middleware/ratelimit.go` and `blacklist.go` use process-local maps. They:
- Do not survive a restart (blacklist forgotten → revoked tokens briefly usable).
- Do not share state across multiple replicas (horizontal scale needs a Redis-backed limiter).
**Acceptable** for a single-node deployment (our production compose is single-replica). See §5.

### 3.6 [LOW] Public endpoints unthrottled
`/api/v1/public/appointments` and `/api/v1/public/doctors` have no rate limit → appointment-booking spam / request flooding is possible.
**Recommendation:** apply a per-IP limiter to the public group.

### 3.7 [LOW] `DB_SSL_MODE=disable`
Acceptable while PostgreSQL stays on the isolated Docker network (never exposed to the host — confirmed in `docker-compose.prod.yml`). Enable TLS only if the DB must cross networks.

### 3.8 [LOW] No alerting on credential-stuffing bursts
Rate limiting throttles, but there is no logged metric / alert when a single IP consistently hits the limit. Recommended for SIEM/uptime integration later.

### 3.9 [LOW] Semantics
- `X-XSS-Protection` is deprecated by browsers; harmless to keep — CSP is the real control.
- CSP `style-src 'unsafe-inline'` is **required** by the current codebase (extensive inline `style={}` attributes). Acceptable trade-off; long-term prefer CSS modules/classes and tighten to 'unsafe-inline' only for `style-src-attr`.

---

## 4. Secret Hygiene

- `.env.production.example` ships with placeholder values; **real** secrets must be generated and injected only on the server (never committed).
  ```
  openssl rand -base64 48        # JWT_SECRET
  openssl rand -base64 32        # DB_PASSWORD / REDIS_PASSWORD
  ```
- Backend **enforces** `JWT_SECRET` length ≥ 32 (`config.go:21-78`), a good guard against weak secrets.
- `.dockerignore` / `.gitignore` should exclude `.env`, `.env.production`, and any secrets (verify before first deploy).

---

## 5. Production Hardening Checklist

- [x] CORS restricted to real HTTPS origin (`.env.production.example:32`)
- [x] JWT reduced/confirmed TTLs (access 60 min, refresh 168 h)
- [x] **Trusted proxies pinned** to internal CIDRs (HARDEN #1)
- [x] **CSP applied to SPA HTML** (HARDEN #2)
- [x] Swagger 404 in prod (already)
- [x] DB/Redis on internal-only network, not exposed (compose)
- [x] Redis password enforced (compose `--requirepass`)
- [ ] Enable PostgreSQL TLS if DB ever leaves the isolated network
- [ ] Rotate the bootstrap super-admin password on first login
- [ ] Move frontend tokens to cookies w/ rotation (medium-term)
- [ ] Add rate limits to public endpoints (low)

---

## 5. Scaling Notes (future)
Current single-node compose is correct. To scale horizontally later:
1. Replace in-memory `RateLimiter`/`TokenBlacklist` with a **Redis-backed** implementation (Redis is already in the stack).
2. Use Postgres session/token table for **refresh-token rotation**.
3. Ensure `TRUSTED_PROXIES` covers the load-balancer/ingress CIDRs behind the changed topology.