# TrustyConvert DevOps & Deployment Guide

This document outlines a practical and scalable approach to deploying TrustyConvert, including how to extend it with new services like Poppler, LibreOffice/UnoServer, and more. It emphasizes containerization, service orchestration, and developer-friendly practices.

## 📦 Stack Overview

### Core Services

- FastAPI app with optional in-container HTTPS
- Celery for background task processing
- Redis for caching, sessions, and Celery broker
- UnoServer for LibreOffice-based document conversion
- ClamAV for virus scanning
- Poppler (via system packages in app container)
- Optional: NGINX reverse proxy for production HTTPS

### Docker Architecture Summary

- TrustyConvert uses `docker-compose.yml` to define and coordinate services.
- Healthchecks ensure services like Redis, UnoServer, and ClamAV are ready before usage.
- A `shared_files` Docker volume is mounted across services that need file access.
- Services communicate via Docker internal DNS (e.g. `unoserver:2003`).
- SSL certs can be provided in-container or handled via NGINX.

## ⚙ Dockerfile Highlights (API & Celery)

```dockerfile
FROM python:3.13-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    poppler-utils \
    libmagic1 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN mkdir -p /app/certs

COPY requirements.txt .
RUN pip install --no-cache-dir --force-reinstall --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "443", "--ssl-keyfile", "/app/certs/server.key", "--ssl-certfile", "/app/certs/server.crt"]
```

## Adding & Integrating New Services

### General Steps to Add a Service

1. Choose whether to install in the app container (e.g. `poppler-utils`) or run as a sidecar container (e.g. `unoserver`).
2. Mount shared volume if services operate on files.
3. Expose ports if needed, using Docker's internal networking.
4. Add `depends_on` and healthchecks to ensure readiness.
5. Pass host/port via environment variables to API and Celery containers.

### Adding LibreOffice/UnoServer

```yaml
unoserver:
  image: ghcr.io/unoconv/unoserver-docker
  ports:
    - "2003:2003"
  volumes:
    - shared_files:/shared
  healthcheck:
    test: ["CMD", "nc", "-z", "localhost", "2003"]
    interval: 90s
    timeout: 10s
    retries: 3
```

### Adding ClamAV

```yaml
clamav:
  image: clamav/clamav:latest
  ports:
    - "3310:3310"
  volumes:
    - clamav-db:/var/lib/clamav
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "clamdscan", "--version"]
    interval: 90s
    timeout: 10s
    retries: 3
```

### Adding Poppler

Just add to Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y poppler-utils
```

No extra container needed.

### Adding Tesseract OCR

```yaml
tesseract:
  image: tesseractshadow/tesseract4re
  volumes:
    - shared_files:/shared
```

Update API/Celery with env vars:

```yaml
environment:
  - TESSERACT_HOST=tesseract
```

## 🔒 Security Practices

- SSL termination in-container or via NGINX
- Use `.env` files or Docker secrets for passwords/API keys
- Bind external ports only when needed (e.g., only expose API or NGINX)
- Protect shared volumes (avoid mounting into untrusted containers)

## CI/CD Suggestions

**Automate builds and deploys:**
- GitHub Actions / GitLab CI pipelines
- Run lint/tests, build images, push to GHCR or Docker Hub
- Use systemd, Watchtower, or webhooks for auto-deploy

**Example step:**

```yaml
- name: Deploy
  run: docker-compose up --build -d
```

## Local Dev Setup

**Run everything:**
```bash
docker-compose --env-file .env up --build
```

**Run just API + dependencies:**
```bash
docker-compose up api redis clamav unoserver
```

## Maintenance

- Redis TTL clears expired sessions after 24h
- Celery task files cleaned after processing or by periodic jobs
- Consider a cleanup Celery task or cron container

## Final Checklist

- [x] All services defined in `docker-compose.yml`
- [x] Shared volume used by file-processing services
- [x] SSL support set up correctly
- [x] Celery + Redis properly linked
- [x] ClamAV and UnoServer healthchecks
- [x] New tools (Poppler, Tesseract) integrated and tested
- [x] CI/CD pipeline deployed and tested

For help or questions, contact the DevOps team or refer to the internal docs repo.