import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// List all games
router.get('/', requireAuth, async (_req, res) => {
  const games = await prisma.game.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { partyGames: true } } },
  })
  res.json(games)
})

// Create game (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, source, sourceNote, minPlayers, maxPlayers } = req.body
  const game = await prisma.game.create({
    data: { name, source: source || 'steam', sourceNote: sourceNote || '', minPlayers: minPlayers || 1, maxPlayers },
  })
  res.json(game)
})

// Update game (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, source, sourceNote, minPlayers, maxPlayers } = req.body
  const game = await prisma.game.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(source !== undefined && { source }),
      ...(sourceNote !== undefined && { sourceNote }),
      ...(minPlayers !== undefined && { minPlayers }),
      ...(maxPlayers !== undefined && { maxPlayers }),
    },
  })
  res.json(game)
})

// Delete game (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.game.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

// Add game to party (admin)
router.post('/party/:partyId/:gameId', requireAdmin, async (req, res) => {
  const partyGame = await prisma.partyGame.create({
    data: { partyId: Number(req.params.partyId), gameId: Number(req.params.gameId) },
    include: { game: true },
  })
  res.json(partyGame)
})

// Remove game from party (admin)
router.delete('/party/:partyId/:gameId', requireAdmin, async (req, res) => {
  await prisma.partyGame.delete({
    where: { partyId_gameId: { partyId: Number(req.params.partyId), gameId: Number(req.params.gameId) } },
  })
  res.json({ ok: true })
})

export default router
