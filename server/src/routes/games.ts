import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// List games — admins see all, members see only approved
router.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user
  const where = user.role === 'admin' ? {} : { approved: true }
  const games = await prisma.game.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { submittedBy: { select: { id: true, displayName: true } } },
  })
  res.json(games)
})

// Create game — any authenticated user; admin submissions are auto-approved
router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user
  const { name, source, sourceNote, minPlayers, maxPlayers, storeUrl } = req.body
  const game = await prisma.game.create({
    data: {
      name,
      source: source || 'steam',
      sourceNote: sourceNote || '',
      minPlayers: minPlayers || 1,
      maxPlayers,
      storeUrl: storeUrl || '',
      approved: user.role === 'admin',
      submittedById: user.id,
    },
    include: { submittedBy: { select: { id: true, displayName: true } } },
  })
  res.json(game)
})

// Approve a pending game (admin)
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const game = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: { approved: true },
    include: { submittedBy: { select: { id: true, displayName: true } } },
  })
  res.json(game)
})

// Update game (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, source, sourceNote, minPlayers, maxPlayers, storeUrl } = req.body
  const game = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(source !== undefined && { source }),
      ...(sourceNote !== undefined && { sourceNote }),
      ...(minPlayers !== undefined && { minPlayers }),
      ...(maxPlayers !== undefined && { maxPlayers }),
      ...(storeUrl !== undefined && { storeUrl }),
    },
    include: { submittedBy: { select: { id: true, displayName: true } } },
  })
  res.json(game)
})

// Delete game (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.game.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
