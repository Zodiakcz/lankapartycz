import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { prisma } from './lib/prisma'
import authRoutes from './routes/auth'
import partyRoutes from './routes/parties'
import attendanceRoutes from './routes/attendance'
import gameRoutes from './routes/games'
import scheduleRoutes from './routes/schedule'
import expenseRoutes from './routes/expenses'
import packingRoutes from './routes/packing'
import shoppingRoutes from './routes/shopping'
import faqRoutes from './routes/faq'
import leaderboardRoutes from './routes/leaderboard'
import { startScheduler } from './services/scheduler'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const isProd = process.env.NODE_ENV === 'production'
const secureCookies = process.env.COOKIE_SECURE === 'true'

// Trust the reverse proxy (Caddy) so secure cookies and rate limiting work
app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// Rate limiting — general: 100 req/min, auth endpoints: stricter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(generalLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Příliš mnoho pokusů, zkuste to později' },
})

app.use(cors({
  origin: isProd ? false : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '100kb' }))

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: secureCookies,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

// Apply stricter rate limit to auth endpoints
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/self-register', authLimiter)

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/parties', partyRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/packing', packingRoutes)
app.use('/api/shopping', shoppingRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/leaderboard', leaderboardRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Global error handler — catch unhandled errors in routes
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Interní chyba serveru' })
})

async function seed() {
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: { username: 'admin', displayName: 'Admin', passwordHash: hash, role: 'admin', approved: true },
    })
    console.log('Vytvořen admin účet (admin / admin123)')
  }

  const itemCount = await prisma.packingItem.count()
  if (itemCount === 0) {
    await prisma.packingItem.createMany({
      data: [
        { name: 'PC / Notebook', category: 'hardware' },
        { name: 'Monitor', category: 'hardware' },
        { name: 'Klávesnice + myš', category: 'hardware' },
        { name: 'Sluchátka / headset', category: 'hardware' },
        { name: 'Prodlužovačka', category: 'hardware' },
        { name: 'Ethernet kabel', category: 'hardware' },
        { name: 'Spací pytel / peřina', category: 'general' },
        { name: 'Polštář', category: 'general' },
        { name: 'Karimatka / matrace', category: 'general' },
        { name: 'Hygienické potřeby', category: 'general' },
        { name: 'Ručník', category: 'general' },
        { name: 'Přezůvky', category: 'general' },
        { name: 'Chipsy / snacky', category: 'food' },
        { name: 'Pití', category: 'food' },
      ],
    })
    console.log('Vytvořeny výchozí položky k zabalení')
  }
}

seed().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server běží na portu ${PORT}`)
    startScheduler()
  })
})
