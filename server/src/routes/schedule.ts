import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

// Get schedule for a party
router.get('/:partyId', requireAuth, async (req, res) => {
  const schedule = await prisma.schedule.findMany({
    where: { partyId: Number(req.params.partyId) },
    orderBy: [{ day: 'asc' }, { time: 'asc' }],
  })
  res.json(schedule)
})

// Add schedule item (admin)
router.post('/:partyId', requireAdmin, async (req, res) => {
  const { day, time, title, description, gameId } = req.body
  const item = await prisma.schedule.create({
    data: {
      partyId: Number(req.params.partyId),
      day,
      time,
      title,
      description: description || '',
      gameId,
    },
  })
  res.json(item)
})

// Update schedule item (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { day, time, title, description, gameId } = req.body
  const item = await prisma.schedule.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(day !== undefined && { day }),
      ...(time !== undefined && { time }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(gameId !== undefined && { gameId }),
    },
  })
  res.json(item)
})

// Delete schedule item (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.schedule.delete({ where: { id: Number(req.params.id) } })
  res.json({ ok: true })
})

export default router
