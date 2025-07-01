# 🔒 Secure & Scalable File Conversion Platform – Developer Specification

## 🧱 High-Level Architecture

- **Frontend:** HTML/JS app or SPA  
- **Backend:** FastAPI (Dockerized)  
- **Validation/Conversion:** ClamAV, ImageMagick, Poppler, LibreOffice  
- **State Management:** Redis (24h TTL)  
- **Async Queue:** Celery + Redis  
- **Storage:** Docker volume `/shared/tmp/{session_id}/`  
- **Serving:** Nginx + `X-Accel-Redirect`  
- **Cache:** IndexedDB  

## 📁 File & Data Storage Schema

### Disk

```
/shared/tmp/{session_id}/
├── uploads/
│   └── {uuid}.ext
└── converted/
    └── {uuid}.{target_ext}
```

### Redis

```json
session:{session_id} = {
  "csrf_token": "...",
  "created_at": "..."
}

session:{session_id}:jobs:{job_id} = {
  "original_filename": "...",
  "target_format": "...",
  "stored_path": "...",
  "converted_path": "...",
  "status": "...",
  "task_id": "...",
  "created_at": "...",
  "completed_at": "...",
  "error_message": "..."
}

download_token:{token} = {
  "session_id": "...",
  "job_id": "...",
  "file_path": "...",
  "expires_at": "..."
}
```

### IndexedDB (Frontend)

```json
{
  "job_id": "...",
  "original_filename": "...",
  "target_format": "...",
  "download_token": "...",
  "status": "...",
  "timestamp": "..."
}
```

## 📡 API Endpoints

- `GET /session/init`
- `POST /upload`
- `POST /convert`
- `GET /job_status?job_id=...`
- `POST /download_token`
- `GET /download?token=...`
- `POST /session/close`

## 🔄 Detailed Flow (Free User)

1. Frontend initializes session  
2. User uploads file → `/upload`  
3. User starts conversion → `/convert`  
4. Celery processes  
5. Frontend polls `/job_status`  
6. Frontend downloads file  
7. Session expires or `/session/close`

## 🔐 Security Summary

| Feature          | Purpose                                  |
|------------------|-------------------------------------------|
| Session Cookie   | Anonymous identity (24h)                 |
| CSRF Token       | POST protection                          |
| Job ID           | Track file uploads                       |
| Task ID          | Track Celery jobs                        |
| Download Token   | Time-limited file access                 |
| `X-Accel-Redirect` | Secure internal file serving           |

## ⚠️ Developer Notes

- Use `uuid4()` or `secrets.token_urlsafe()` for IDs
- Validate requests using session + CSRF
- Use `/session/close` for cleanup
- Shared volume for all file access

## ✅ Optional Features

- Authenticated premium users
- Retry failed jobs
- Previews of converted files
- Upload history for users
