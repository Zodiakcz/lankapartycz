import { Response } from 'express'
import { prisma } from './prisma'

export async function isFinanceLocked(partyId: number): Promise<boolean> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { financesLocked: true },
  })
  return Boolean(party?.financesLocked)
}

export async function blockIfLocked(partyId: number, res: Response): Promise<boolean> {
  if (await isFinanceLocked(partyId)) {
    res.status(423).json({ error: 'Finance jsou uzavřeny' })
    return true
  }
  return false
}
