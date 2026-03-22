import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Set/update attendance for current user
router.post('/:partyId', requireAuth, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const userId = req.session.userId!
  const { status, arrival, departure, advance } = req.body

  const attendance = await prisma.attendance.upsert({
    where: { userId_partyId: { userId, partyId } },
    update: {
      status,
      arrival: arrival ? new Date(arrival + (arrival.includes('Z') ? '' : 'Z')) : null,
      departure: departure ? new Date(departure + (departure.includes('Z') ? '' : 'Z')) : null,
      ...(advance !== undefined && { advance: Number(advance) }),
    },
    create: {
      userId,
      partyId,
      status,
      arrival: arrival ? new Date(arrival + (arrival.includes('Z') ? '' : 'Z')) : null,
      departure: departure ? new Date(departure + (departure.includes('Z') ? '' : 'Z')) : null,
      advance: advance ? Number(advance) : 0,
    },
    include: { user: { select: { id: true, displayName: true } } },
  })
  res.json(attendance)
})

// Set advance for any user (admin only)
router.post('/:partyId/advance/:userId', requireAdmin, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const userId = Number(req.params.userId)
  const { advance } = req.body

  const attendance = await prisma.attendance.update({
    where: { userId_partyId: { userId, partyId } },
    data: { advance: Number(advance) },
    include: { user: { select: { id: true, displayName: true } } },
  })
  res.json(attendance)
})

// Admin: edit any user's attendance
router.put('/:partyId/user/:userId', requireAdmin, async (req, res) => {
  const partyId = Number(req.params.partyId)
  const userId = Number(req.params.userId)
  const { status, arrival, departure, advance } = req.body

  const attendance = await prisma.attendance.upsert({
    where: { userId_partyId: { userId, partyId } },
    update: {
      status,
      arrival: arrival ? new Date(arrival + (arrival.includes('Z') ? '' : 'Z')) : null,
      departure: departure ? new Date(departure + (departure.includes('Z') ? '' : 'Z')) : null,
      ...(advance !== undefined && { advance: Number(advance) }),
    },
    create: {
      userId,
      partyId,
      status,
      arrival: arrival ? new Date(arrival + (arrival.includes('Z') ? '' : 'Z')) : null,
      departure: departure ? new Date(departure + (departure.includes('Z') ? '' : 'Z')) : null,
      advance: advance ? Number(advance) : 0,
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
