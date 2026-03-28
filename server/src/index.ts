import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import authRoutes from './routes/auth'
import partyRoutes from './routes/parties'
import attendanceRoutes from './routes/attendance'
import gameRoutes from './routes/games'
import scheduleRoutes from './routes/schedule'
import expenseRoutes from './routes/expenses'
import packingRoutes from './routes/packing'
import shoppingRoutes from './routes/shopping'
import faqRoutes from './routes/faq'
import { startScheduler } from './services/scheduler'

const prisma = new PrismaClient()
const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true when you add HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
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
