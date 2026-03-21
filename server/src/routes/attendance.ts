import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Set/update attendance for current user
router.post('/:partyId', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const userId = req.session.userId!
  const { status, arrival, departure } = req.body

  const attendance = await prisma.attendance.upsert({
    where: { userId_partyId: { userId, partyId } },
    update: {
      status,
      arrival: arrival ? new Date(arrival) : null,
      departure: departure ? new Date(departure) : null,
    },
    create: {
      userId,
      partyId,
      status,
      arrival: arrival ? new Date(arrival) : null,
      departure: departure ? new Date(departure) : null,
    },
    include: { user: { select: { id: true, displayName: true } } },
  })
  res.json(attendance)
})

// Get attendance for a party
router.get('/:partyId', requireAuth, async (req, res) => {
  const attendance = await prisma.attendance.findMany({
    where: { partyId: Number(req.params.partyId) },
    include: { user: { select: { id: true, displayName: true } } },
    orderBy: { user: { displayName: 'asc' } },
  })
  res.json(attendance)
})

export default router
