# JSON Vault Frontend

React + Vite SPA for the JSON editor experience (Phase 2).

## Prerequisites

- Node.js 22+
- Backend running (`cd backend && pnpm dev`) on `http://localhost:8787`

## Setup

```bash
nvm use
pnpm install
cp .env.example .env
pnpm dev
```

App: `http://localhost:5173`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite local dev server (`localhost:5173`) |
| `npm run build` | Production build → `dist/` |
| `npm run pages:deploy` | Build + deploy to Cloudflare Pages (`jsonvault-web`) |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Unit tests |
| `pnpm typecheck` | TypeScript check |

## API wiring

| UI action | Backend |
|-----------|---------|
| Save (new) | `POST /api/v1/createblobs` |
| Save (existing) | `POST /api/v1/updateblobs` |
| Load `/b/:id` | `POST /api/v1/getblobs` |
| Delete | `POST /api/v1/deleteblobs` |

Edit tokens are stored in `localStorage` under `jv_edit_token:{blobId}`.

## Deploy (Cloudflare Pages)

```bash
cd frontend
npm run pages:deploy
```

This builds with `.env.production` (`VITE_API_URL` / `VITE_APP_URL`) and deploys `dist/` to the `jsonvault-web` Pages project.

Local only:

```bash
npm run dev
```
