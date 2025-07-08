# 🚀 Frontend Development Guide for TrustyConvert

This guide outlines how to develop the frontend using **Astro v5.9.1** (static output mode) and **React** for interactive components.

## 🧱 Architecture Overview

- **Framework:** Astro (static output mode)
- **Interactive Components:** React (minimized use)
- **Data Flow:** REST API with `fetch` + `@tanstack/react-query`
- **State Management:** nanostores
- **Styling:** Tailwind CSS + radix-ui
- **Testing:** Vitest + Testing Library

## 🌐 Pages Structure (Astro Static Routes)

| Route            | Description                          | React Used? |
| ---------------- | ------------------------------------ | ----------- |
| `/`              | Home page (upload, start conversion) | Minimal     |
| `/download/[id]` | Download result page                 | No          |
| `/privacy`       | Static policy page                   | No          |
| `/about`         | Info about TrustyConvert             | No          |

> Keep all SEO content in `.astro` files. Use React only for isolated interactive parts.

## 🔒 Security Principles (Frontend)

- Use `Secure; HttpOnly` session cookie
- Store CSRF token in-memory (not on disk)
- All API requests must include `X-CSRF-Token` header
- Avoid passing tokens in URL
- Use one-time download tokens

## 📁 Key Folders and Files

```
/src
├── components/      # React and Astro components
├── lib/             # Fetch, validation, CSRF, utils
├── pages/           # Astro pages
├── stores/          # Nanostores
├── styles/          # Tailwind CSS
└── types/           # TypeScript types
```

## 🔄 API Integration Pattern

```ts
interface ApiResponse<T> {
	success: boolean
	data: T
}
```

Example:

```ts
const res = await fetch('/api/upload', { ... });
const json: ApiResponse<{ job_id: string }> = await res.json();
```

## 🔌 API Flow per Page

### Home Page

1. `GET /session/init`
2. Store CSRF token in nanostores
3. On file upload: `POST /upload`
4. On convert click: `POST /convert`
5. Polling: `GET /job_status?job_id=...`
6. On success: `POST /download_token` → `GET /download?token=...`

### Download Page

- Use route param to show status or preview

## ⚙️ Performance & Best Practices

- Use Astro Islands for React
- Avoid global React
- Lazy-load assets
- Preconnect to API base URL

## 🔍 SEO Guidelines

- Set `<title>`, `<meta name="description">`, etc.
- Use semantic HTML
- Add `alt` attributes to images

## 🧼 Session and File Cleanup Support

- Redis session TTL: 24h
- Uploads deleted after conversion
- Converted files deleted on expiry or `/session/close`
- Frontend should offer a "Close Session" button
