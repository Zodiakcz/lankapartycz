# LAN Party Organizer

Web app for organizing twice-yearly LAN parties for a Czech friend group (~8-12 people).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM
- **Deployment:** Docker Compose + Caddy (HTTPS) on home Proxmox server
- **CI/CD:** GitHub Actions builds images → GHCR → Watchtower auto-pulls

## Project Structure

```
├── client/                  # React frontend (Vite)
│   ├── src/pages/           # Login, Parties, PartyDetail, Games, Packing, Faq, Admin, ChangePassword
│   ├── src/components/      # Layout, PackingList, ShoppingTab
│   ├── src/lib/             # api.ts (fetch wrapper), auth.tsx (AuthContext), types.ts, constants.ts
│   ├── nginx.conf           # Production nginx config (serves SPA + proxies /api + security headers)
│   └── Dockerfile
├── server/                  # Express backend
│   ├── src/routes/          # auth, parties, attendance, games, schedule, expenses, packing, shopping, faq
│   ├── src/middleware/       # auth.ts (requireAuth, requireAdmin)
│   ├── src/services/        # discord.ts (webhooks), scheduler.ts (cron notifications)
│   ├── src/lib/             # prisma.ts (shared PrismaClient singleton)
│   ├── src/index.ts         # Entry point, seed, security middleware (helmet, rate limiting)
│   ├── prisma/schema.prisma # Database schema
│   └── Dockerfile
├── Caddyfile                # Production reverse proxy (HTTPS termination)
├── docker-compose.yml       # Local dev (builds from source)
├── docker-compose.prod.yml  # Production (pulls from GHCR, includes Caddy)
└── .github/workflows/       # CI: build + push to ghcr.io/zodiakcz/lankapartycz
```

## Key Decisions

- **SQLite** (not Postgres) — single file DB, perfect for <15 users, easy backup
- **Auto-seed on startup** — server/src/index.ts creates admin user + default packing items if DB is empty
- **Session auth** — express-session with 7-day cookies, `sameSite: lax`, `secure` in production, no JWT
- **Two roles:** admin (create parties, users, games, schedule) and member (attendance, expenses)
- **Finance split** — shared expenses divided proportionally by nights stayed per person
- **UI language:** Czech throughout
- **Version shown on login page** — auto-generated from git at build time via `__APP_VERSION__` define in vite.config.ts
- **PrismaClient singleton** — all routes import from `server/src/lib/prisma.ts`, never instantiate their own
- **Security hardening** — helmet (security headers), express-rate-limit (brute force protection on login/register), JSON body size limit (100kb), trust proxy for Caddy
- **Design system** — reusable CSS component utilities defined in `client/src/index.css` (`card`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-success`, `form-input`, `form-select`, `form-label`, `badge`, `badge-*`, `tab-bar`, `tab-item`, `tab-active`, `tab-inactive`). Use these instead of repeating raw Tailwind color classes.
- **Color palette** — `zinc-950` body bg, `zinc-900` cards, `zinc-800` inputs; `indigo` as primary accent (not `blue`)
- **Mobile nav** — bottom tab bar (fixed, `sm:hidden`) in Layout.tsx; desktop nav in top header
- **Discord notifications** — webhook for attendance changes, new registrations, and party reminders (scheduler service)

## Local Development

```bash
# Terminal 1 - backend (http://localhost:3000)
cd server && npm run dev

# Terminal 2 - frontend (http://localhost:5173, proxies /api to :3000)
cd client && npm run dev
```

Default login: admin / admin123

## Deployment

Push to master → GitHub Actions builds Docker images → Watchtower auto-updates.

Manual update on server:
```bash
cd /opt/lankaparty
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
```

## GitHub

- Repo: https://github.com/Zodiakcz/lankapartycz
- Container images: ghcr.io/zodiakcz/lankapartycz/server and /client
