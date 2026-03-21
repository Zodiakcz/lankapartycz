import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Vyplňte uživatelské jméno a heslo' })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Nesprávné přihlašovací údaje' })
  }

  req.session.userId = user.id
  req.session.role = user.role
  res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role })
})

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, username: true, displayName: true, role: true },
  })
  res.json(user)
})

// Register new user (admin only)
router.post('/register', requireAdmin, async (req, res) => {
  const { username, displayName, password, role } = req.body
  if (!username || !displayName || !password) {
    return res.status(400).json({ error: 'Vyplňte všechna pole' })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return res.status(400).json({ error: 'Uživatelské jméno již existuje' })
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, displayName, passwordHash: hash, role: role || 'member' },
  })
  res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role })
})

// List all users
router.get('/users', requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, role: true },
    orderBy: { displayName: 'asc' },
  })
  res.json(users)
})

export default router
