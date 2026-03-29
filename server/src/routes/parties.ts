import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

// List all parties
router.get('/', requireAuth, async (_req, res) => {
  const parties = await prisma.party.findMany({
    include: {
      attendance: { include: { user: { select: { id: true, displayName: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { startDate: 'desc' },
  })
  res.json(parties)
})

// Get single party with all details
router.get('/:id', requireAuth, async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      attendance: { include: { user: { select: { id: true, displayName: true } } } },
      schedule: { orderBy: [{ day: 'asc' }, { time: 'asc' }] },
      expenses: { include: { paidBy: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' } },
      packingItems: { orderBy: { category: 'asc' } },
    },
  })
  if (!party) return res.status(404).json({ error: 'Párty nenalezena' })
  res.json(party)
})

// Create party (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, location, startDate, endDate, description, advancePerNight } = req.body
  const party = await prisma.party.create({
    data: { name, location, startDate: new Date(startDate), endDate: new Date(endDate), description: description || '', advancePerNight: advancePerNight ? Number(advancePerNight) : 0 },
  })
  res.json(party)
})

// Update party (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, location, startDate, endDate, description, notes, placeAddress, placeStatus, advancePerNight } = req.body
  const party = await prisma.party.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
      ...(placeAddress !== undefined && { placeAddress }),
      ...(placeStatus !== undefined && { placeStatus }),
      ...(advancePerNight !== undefined && { advancePerNight: Number(advancePerNight) }),
    },
  })
  res.json(party)
})

// Delete party (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.party.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
