import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

export const THRESHOLD_DEFAULTS: Record<string, number> = {
  threshold_veteran: 5,
  threshold_nocni_valecnik: 20,
  threshold_sponzor: 2000,
  threshold_velky_sponzor: 5000,
  threshold_nakupovac: 3,
}

router.get('/', requireAuth, async (_req, res) => {
  const rows = await prisma.setting.findMany()
  const result: Record<string, number> = { ...THRESHOLD_DEFAULTS }
  for (const row of rows) {
    const num = Number(row.value)
    if (!isNaN(num)) result[row.key] = num
  }
  res.json(result)
})

router.put('/', requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, number>
  const allowed = new Set(Object.keys(THRESHOLD_DEFAULTS))
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.has(key) || typeof value !== 'number' || value < 0) continue
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  // Return updated settings
  const rows = await prisma.setting.findMany()
  const result: Record<string, number> = { ...THRESHOLD_DEFAULTS }
  for (const row of rows) {
    const num = Number(row.value)
    if (!isNaN(num)) result[row.key] = num
  }
  res.json(result)
})

export default router
