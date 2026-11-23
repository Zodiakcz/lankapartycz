import { prisma } from './prisma'

// Who usually pays the accommodation: the payer of the latest party that has one,
// otherwise the user called Štajgi. Null when neither exists.
export async function defaultStayPayerId(): Promise<number | null> {
  const last = await prisma.party.findFirst({
    where: { stayPaidByUserId: { not: null } },
    orderBy: { startDate: 'desc' },
    select: { stayPaidByUserId: true },
  })
  if (last?.stayPaidByUserId) return last.stayPaidByUserId

  const users = await prisma.user.findMany({ select: { id: true, displayName: true, username: true } })
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const stajgi = users.find(u => norm(u.displayName) === 'stajgi' || norm(u.username) === 'stajgi')
  return stajgi?.id ?? null
}
