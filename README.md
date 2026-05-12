# NT Woods Careers - React + Vite

Ye project uploaded standalone careers/application HTML ka React + Vite conversion hai.

## Included

- React-controlled application form
- Premium careers landing page layout
- Cloudflare Turnstile integration
- Backend API URL set to `https://ntwoods.onrender.com/api`
- Two-step submission flow preserved:
  - `POST /api/v1/apply/init`
  - `POST /api/v1/apply/upload-cv`
- Session draft save/restore
- CV drag-and-drop upload with remove button
- File validation: PDF, DOC, DOCX up to 2MB
- Consent checkbox
- Source tracking via URL params: `?source=whatsapp`, `?utm_source=...`, or `?ref=...`

## Setup

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` if you want to override defaults:

```bash
VITE_API_BASE=https://ntwoods.onrender.com/api
VITE_TURNSTILE_SITE_KEY=0x4AAAAAACVpKor7RIjOUDfl
```

## Important Notes

- Backend Turnstile secret validation server-side par hona chahiye.
- Frontend file validation UX ke liye hai; backend par bhi file size/type validation mandatory rahegi.
- Production deployment ke liye backend CORS me frontend domain allow hona chahiye.
