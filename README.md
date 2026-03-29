# LAN Party Organizer

Web app for organizing twice-yearly LAN parties for a Czech friend group (~8-12 people). Built to replace scattered Discord messages with one central place for attendance, games, scheduling, finances, and shopping.

## Features

- **Parties** — create and manage LAN party events with dates and location
- **Attendance** — sign up, set arrival/departure times, track who's coming
- **Games** — maintain a game library with sources (Steam, Epic, copied, free)
- **Schedule** — day-by-day program for the event
- **Finances** — log shared expenses, advance payments, auto-split costs by nights stayed
- **Shopping** — food calculation based on person-nights + free-form shopping checklist
- **Packing list** — shared checklist of what to bring
- **FAQ** — markdown-formatted Q&A for party logistics
- **Admin** — user management, edit attendance on behalf of others
- **Discord notifications** — automated reminders for advance payments, upcoming parties, and schedule items

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM
- **Deployment:** Docker Compose + Caddy (automatic HTTPS)
- **CI/CD:** GitHub Actions → GHCR → Watchtower auto-pull

## Quick Start

### Local Development

```bash
# Backend (http://localhost:3000)
cd server && npm install && npm run dev

# Frontend (http://localhost:5173, proxies /api to :3000)
cd client && npm install && npm run dev
```

Default login: `admin` / `admin123`

### Docker

```bash
# Create session secret
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env

# Build and run
docker compose up -d
```

App will be available at `http://localhost`.

### Production (Docker + GHCR)

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose -f docker-compose.prod.yml up -d
```

Push to `master` → GitHub Actions builds images → Watchtower auto-updates.

## Project Structure

```
├── client/                  # React frontend (Vite)
│   ├── src/pages/           # Login, Parties, PartyDetail, Games, Packing, Faq, Admin, ChangePassword
│   ├── src/components/      # Layout, PackingList, ShoppingTab
│   ├── src/lib/             # api.ts (fetch wrapper), auth.tsx (AuthContext), types.ts, constants.ts
│   ├── nginx.conf           # Production nginx (SPA + /api proxy + security headers)
│   └── Dockerfile
├── server/                  # Express backend
│   ├── src/routes/          # auth, parties, attendance, games, schedule, expenses, packing, shopping, faq
│   ├── src/middleware/       # auth.ts (requireAuth, requireAdmin)
│   ├── src/services/        # discord.ts (webhooks), scheduler.ts (cron notifications)
│   ├── src/lib/             # prisma.ts (shared PrismaClient singleton)
│   ├── src/index.ts         # Entry point + auto-seed
│   ├── prisma/schema.prisma # Database schema
│   └── Dockerfile
├── Caddyfile                # Production reverse proxy (HTTPS)
├── docker-compose.yml       # Local dev (builds from source)
├── docker-compose.prod.yml  # Production (pulls from GHCR, includes Caddy)
└── .github/workflows/       # CI: build + push images
```

## License

Private project — no license.
