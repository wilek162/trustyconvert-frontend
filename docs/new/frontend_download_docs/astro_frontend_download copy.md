# Using the Download Endpoint from a Static Astro + React Front-end

> Applies to **production** (`https://trustyconvert.com`) and **local dev** (`https://localhost:4322`).
>
> Back-end lives at `https://api.trustyconvert.com` in both environments.

---

## 1. Why this guide exists

The download endpoint (`GET /api/download?token=<token>`) requires two security artifacts:

1. The `trustyconvert_session` cookie (issued by `/api/session/init`).
2. A one-time *download token* (issued by `POST /api/download_token`).

Because the SPA is **static** (Astro build) the browser itself must ensure these requirements are met—there is no server-side rendering layer to help.

---

## 2. Recommended URL strategy

### Production

* SPA is served from **`https://trustyconvert.com`** by Nginx.
* Same Nginx config proxies `/api/*` to FastAPI (block `location /api`), so the SPA can use **relative** paths:

```
/api/session/init
/api/download_token
/api/download?token=…
```

All requests stay on the same origin ⇒ cookies flow automatically.

### Split hosting: Cloudflare Pages (SPA) + DigitalOcean API

When the SPA is on Cloudflare Pages (`https://trustyconvert.com`) and the API/Nginx lives on a separate Droplet (`https://api.trustyconvert.com`):

**Option A – Direct navigation (simplest)**

```ts
window.location.href = `https://api.trustyconvert.com/api/download?token=${token}`;
```
* The domain changes only for the request that triggers the browser download.
* Cookies *are* sent because they use `Domain=.trustyconvert.com` and `SameSite=None`.
* Bytes stream straight from DigitalOcean Nginx.

**Option B – Cloudflare Worker proxy (stay on main domain)**

1. Create a Pages Function or Worker route:
   ```js
   export async function onRequest({ request }) {
     const url = new URL(request.url);
     const apiUrl = `https://api.trustyconvert.com${url.pathname}`;
     return fetch(apiUrl, {
       method: request.method,
       headers: request.headers,
       body: request.body,
       redirect: 'manual',
     });
   }
   ```
2. Deploy under `/api/*`.
3. SPA continues to use relative `/api/…` paths (same as monolithic layout).
4. Add header `Cache-Control: no-store` in the Worker to avoid caching large binaries.

**Trade-offs**
| Approach | Pros | Cons |
| -------- | ---- | ---- |
| Direct navigation | Zero infra work; no egress via Cloudflare | URL bar shows `api.`; any analytic session may treat it as a separate domain |
| Worker proxy | User never leaves main origin; avoids CORS entirely | Worker bandwidth incurs cost; files tunnel through Cloudflare edge |

For most teams, Option A is adequate; switch to Option B if you need branding consistency.


### Local development

Choose *one* of the following:

| Option | How | Pros | Cons |
| ------ | --- | ---- | ---- |
| **Docker** (recommended) | `docker compose up` – Nginx serves static build and proxies `/api` | Exactly matches prod; no CORS | Docker needed, slower HMR |
| **Vite proxy** | Add `server.proxy['/api']` in `astro.config.mjs` (example below) | Keep Astro HMR; same-origin | Slightly more config |
| Full API host nav | Use full URL **only for the final redirect** | Zero config | User briefly visits `api.trustyconvert.com` ; other XHR calls still need `credentials:'include'` |

#### Vite proxy snippet

```js
// astro.config.mjs
export default {
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'https://api.trustyconvert.com',
          changeOrigin: true,
          secure: false, // skip self-signed in dev
        },
      },
    },
  },
};
```

---

## 3. End-to-end React example

```tsx
// src/components/DownloadButton.tsx
import { useState } from 'react';
import api from '@/utils/api';        // axios instance w/ withCredentials=true
import { getCookie } from '@/utils/cookies';

interface Props { jobId: string }

export default function DownloadButton({ jobId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      // 1. obtain token  – CSRF header required
      const res = await api.post(
        '/api/download_token',
        { job_id: jobId },
        { headers: { 'X-CSRF-Token': getCookie('csrftoken') } }
      );
      const token = res.data.download_token;

      // 2. trigger browser download (same origin path)
      window.location.href = `/api/download?token=${token}`;
    } catch (err) {
      console.error('Failed to start download', err);
      alert('Could not obtain download token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Preparing…' : 'Download'}
    </button>
  );
}
```

### Notes
* `api` is an Axios instance configured once: `axios.create({ withCredentials:true, baseURL:'', headers:{ Accept:'application/json' } })`.
* `getCookie` is a small helper to read `document.cookie`.
* The redirect is a **top-level navigation** → the browser streams the file directly from Nginx (no JS memory blow-up).

---

## 4. Error handling & UX

| Error payload (`error_type`) | Likely fix | User message |
| ---------------------------- | ---------- | ------------ |
| `SessionValidationError` | Call `/api/session/init` again, then retry | “Session expired – please retry.” |
| `CSRFValidationError` | Ensure `X-CSRF-Token` header matches cookie | “Security token missing – refresh page.” |
| `TokenError` | Token expired or reused | “Download link expired – click again.” |
| `ResourceNotFound` | Job not finished or cleaned up | “File no longer available.” |

---

## 5. Testing checklist

1. **Happy path** (Cypress):
   * create session → upload → convert → download → assert file data.
2. **Token reuse** → second click returns 403.
3. **Cross-origin dev** → with Vite proxy disabled, ensure top-level nav works.
4. **Large file** (>100 MB) → verify RAM stays low (Nginx does the streaming).

---

## 6. FAQ

**Q — Can we use `fetch` and `blob` instead of redirect?**  You *can*, but the entire file would pass through JS memory, defeating Nginx’s zero-copy benefit. Stick to redirect / `<a download>`.

**Q — Do we need extra CORS headers?**  No. Using the same-origin `/api` path avoids CORS. If you must hit `api.trustyconvert.com` directly, ensure `credentials:'include'` and the server already whitelists origins.

**Q — Why does dev proxy need `secure:false`?**  Most local API certs are self-signed; Vite will reject them unless you disable certificate verification.

---

Happy downloading! 🎉
