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

  if (!user.approved) {
    return res.status(403).json({ error: 'Váš účet čeká na schválení administrátorem' })
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

// Self-registration (public) - creates account pending admin approval
router.post('/self-register', async (req, res) => {
  const { username, displayName, password } = req.body
  if (!username || !displayName || !password) {
    return res.status(400).json({ error: 'Vyplňte všechna pole' })
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Heslo musí mít alespoň 4 znaky' })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return res.status(400).json({ error: 'Uživatelské jméno již existuje' })
  }

  const hash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { username, displayName, passwordHash: hash, role: 'member', approved: false },
  })
  res.json({ ok: true })
})

// Register new user (admin only) - auto-approved
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
    data: { username, displayName, passwordHash: hash, role: role || 'member', approved: true },
  })
  res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role })
})

// List pending (unapproved) users (admin only)
router.get('/pending', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { approved: false },
    select: { id: true, username: true, displayName: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

// Approve a pending user (admin only)
router.post('/approve/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await prisma.user.update({ where: { id }, data: { approved: true } })
  res.json({ ok: true })
})

// Update user (admin only) - role, displayName
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { role, displayName } = req.body
  const data: any = {}
  if (role !== undefined) data.role = role
  if (displayName !== undefined) data.displayName = displayName
  const user = await prisma.user.update({ where: { id }, data, select: { id: true, username: true, displayName: true, role: true } })
  res.json(user)
})

// Delete/reject a user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await prisma.user.delete({ where: { id } })
  res.json({ ok: true })
})

// Change password (any logged-in user for themselves, admin for anyone)
router.post('/change-password', requireAuth, async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Nové heslo musí mít alespoň 4 znaky' })
  }

  const targetUserId = userId && req.session.role === 'admin' ? userId : req.session.userId!

  // Non-admin users must provide current password
  if (req.session.role !== 'admin' || targetUserId === req.session.userId) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Zadejte současné heslo' })
    }
    const user = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: 'Nesprávné současné heslo' })
    }
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash: hash } })
  res.json({ ok: true })
})

// List all approved users
router.get('/users', requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { approved: true },
    select: { id: true, username: true, displayName: true, role: true },
    orderBy: { displayName: 'asc' },
  })
  res.json(users)
})

export default router
