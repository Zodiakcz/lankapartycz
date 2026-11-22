import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { countNights } from '../utils'
import { prisma } from '../lib/prisma'

const router = Router()

const round2 = (n: number) => Math.round(n * 100) / 100

// Per-party totals over time: attendance, person-nights, costs.
// Cost logic mirrors /expenses/:partyId/split (expenses + stay price × person-nights).
router.get('/', requireAuth, async (_req, res) => {
  const now = new Date()

  const parties = await prisma.party.findMany({
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      stayPricePerNight: true,
      attendance: {
        where: { status: 'confirmed' },
        select: { arrival: true, departure: true },
      },
      expenses: { select: { amount: true } },
    },
  })

  const result = parties.map(p => {
    let totalNights = 0
    for (const att of p.attendance) {
      if (att.arrival && att.departure) {
        totalNights += countNights(new Date(att.arrival), new Date(att.departure))
      }
    }
    const expensesTotal = p.expenses.reduce((sum, e) => sum + e.amount, 0)
    const stayCost = p.stayPricePerNight * totalNights
    const totalCost = expensesTotal + stayCost

    return {
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      upcoming: p.endDate >= now,
      attendees: p.attendance.length,
      totalNights,
      expensesTotal: round2(expensesTotal),
      stayCost: round2(stayCost),
      totalCost: round2(totalCost),
      costPerNight: totalNights > 0 ? round2(totalCost / totalNights) : null,
    }
  })

  res.json({ parties: result })
})

export default router
