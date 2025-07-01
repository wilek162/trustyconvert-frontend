# 🔒 Security Architecture and Implementation Plan

This document outlines the security mechanisms for the file conversion platform.

## 1. 🔐 Session Security

### 1.1 Session Creation

- Session ID: UUID4 or `secrets.token_urlsafe()`
- CSRF Token: Separate token
- Storage: Redis (24h TTL)
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`

### 1.2 Validation

- Requires session cookie and `X-CSRF-Token` header
- Backend uses `validate_session()` and `validate_csrf_token()`

### 1.3 Expiration & Cleanup

- Redis TTL handles expiry
- Cleanup job removes files and metadata

## 2. 📤 File Upload and Validation Security

### 2.1 Validation

- Max size: 100MB
- MIME type check via `python-magic`
- Extension matched against whitelist

### 2.2 Antivirus Scanning

- ClamAV daemon in Docker
- Files scanned before conversion

### 2.3 Upload Handling

- Files saved atomically
- Stored as UUIDs in `/shared/tmp/{session_id}/{job_id}/`

## 3. 🚀 Conversion Job Security

- Celery tasks run in isolated containers
- No shell injection (no `shell=True`)
- Strict format whitelisting
- Output paths validated

## 4. 🔑 Download Security

- Token stored in Redis (TTL: 10 mins)
- Download via `X-Accel-Redirect`
- Files not publicly accessible

## 5. 🌐 API Security

- Standard JSON format
- All POST routes require CSRF token
- Planned: rate limiting using `slowapi`

## 6. 🚧 Infrastructure Security

- TLS v1.3 via Nginx
- Services in Docker private network
- Minimal logging; no sensitive data

## 7. 🤺 Future: Authenticated Premium Access

- JWT-based login support
- Session metadata differentiates users
- Premium-only routes with decorators

## 8. ⚠️ Summary of Critical Protections

| Area             | Mechanism                                 |
|------------------|--------------------------------------------|
| Session Handling | Secure cookies + CSRF + Redis TTL          |
| Uploads          | Size/type checks + ClamAV                  |
| Conversion       | Task isolation + validation                |
| Downloads        | Short-lived tokens + secure redirect       |
| API              | CSRF + session checks                      |
| Infrastructure   | TLS + Nginx + container isolation          |
