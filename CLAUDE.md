# LAN Party Organizer

Web app for organizing twice-yearly LAN parties for a Czech friend group (~8-12 people).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM
- **Deployment:** Docker Compose on home Proxmox server (REDACTED)
- **CI/CD:** GitHub Actions builds images → GHCR → Watchtower auto-pulls

## Project Structure

```
├── client/                  # React frontend (Vite)
│   ├── src/pages/           # Login, Parties, PartyDetail, Games, Packing, Admin, ChangePassword
│   ├── src/components/      # Layout (nav bar)
│   ├── src/lib/             # api.ts (fetch wrapper), auth.tsx (AuthContext)
│   ├── nginx.conf           # Production nginx config (serves SPA + proxies /api)
│   └── Dockerfile
├── server/                  # Express backend
│   ├── src/routes/          # auth, parties, attendance, games, schedule, expenses, packing
│   ├── src/middleware/       # auth.ts (requireAuth, requireAdmin)
│   ├── src/index.ts         # Entry point, also runs seed on startup
│   ├── prisma/schema.prisma # Database schema
│   └── Dockerfile
├── docker-compose.yml       # Local dev (builds from source)
├── docker-compose.prod.yml  # Production (pulls from GHCR)
└── .github/workflows/       # CI: build + push to ghcr.io/zodiakcz/lankapartycz
```

## Key Decisions

- **SQLite** (not Postgres) — single file DB, perfect for <15 users, easy backup
- **Auto-seed on startup** — server/src/index.ts creates admin user + default packing items if DB is empty
- **Session auth** — express-session with 7-day cookies, no JWT
- **Two roles:** admin (create parties, users, games, schedule) and member (attendance, expenses)
- **Finance split** — shared expenses divided proportionally by nights stayed per person
- **UI language:** Czech throughout
- **Version shown on login page** — update the version in `client/src/version.ts` when deploying (single source of truth, imported by both Login and Layout)
- **Design system** — reusable CSS component utilities defined in `client/src/index.css` (`card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-success`, `form-input`, `form-select`, `form-label`, `badge`, `badge-*`, `tab-bar`, `tab-item`, `tab-active`, `tab-inactive`). Use these instead of repeating raw Tailwind color classes.
- **Color palette** — `zinc-950` body bg, `zinc-900` cards, `zinc-800` inputs; `indigo` as primary accent (not `blue`)
- **Mobile nav** — bottom tab bar (fixed, `sm:hidden`) in Layout.tsx; desktop nav in top header

## Local Development

```bash
# Terminal 1 - backend (http://localhost:3000)
cd server && npm run dev

# Terminal 2 - frontend (http://localhost:5173, proxies /api to :3000)
cd client && npm run dev
```

Default login: admin / admin123

## Deployment

Push to master → GitHub Actions builds Docker images → Watchtower auto-updates on REDACTED.

Manual update on server:
```bash
cd /opt/lankaparty
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
```

## GitHub

- Repo: https://github.com/Zodiakcz/lankapartycz
- Container images: ghcr.io/zodiakcz/lankapartycz/server and /client
