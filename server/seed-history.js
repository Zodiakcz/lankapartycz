/**
 * One-time script to seed historical LAN party data.
 * Plain JS version that runs inside the production Docker container.
 *
 * Usage:
 *   sudo docker compose -f docker-compose.prod.yml exec server node seed-history.js
 *
 * Copy this file into the container first:
 *   sudo docker compose -f docker-compose.prod.yml cp seed-history.js server:/app/seed-history.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const parties = [
  { name: 'Lanka XIII', location: 'Staříč Fara', startDate: '2022-11-17', endDate: '2022-11-20' },
  { name: 'Lanka XIV', location: 'Staříč Fara', startDate: '2023-04-27', endDate: '2023-05-02' },
  { name: 'Lanka XV', location: 'Staříč Fara', startDate: '2023-11-22', endDate: '2023-11-27' },
  { name: 'Lanka XVI', location: 'Staříč Fara', startDate: '2024-05-07', endDate: '2024-05-13' },
  { name: 'Lanka XVII', location: 'Staříč Fara', startDate: '2024-11-19', endDate: '2024-11-24' },
  { name: 'Lanka XVIII', location: 'Staříč Fara', startDate: '2025-04-29', endDate: '2025-05-04' },
  { name: 'Lanka XIX', location: 'Staříč Fara', startDate: '2025-11-12', endDate: '2025-11-17' },
]

const attendance = [
  { event: 'Lanka XIII', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XIV', participant: 'Dobi', nights: 4 },
  { event: 'Lanka XV', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XVI', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XVII', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XVIII', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XIX', participant: 'Dobi', nights: 5 },
  { event: 'Lanka XIII', participant: 'Ferin', nights: 4 },
  { event: 'Lanka XIV', participant: 'Ferin', nights: 4 },
  { event: 'Lanka XV', participant: 'Ferin', nights: 5 },
  { event: 'Lanka XVI', participant: 'Ferin', nights: 4 },
  { event: 'Lanka XVII', participant: 'Ferin', nights: 4 },
  { event: 'Lanka XVIII', participant: 'Ferin', nights: 5 },
  { event: 'Lanka XIX', participant: 'Ferin', nights: 3 },
  { event: 'Lanka XIII', participant: 'GoRingo', nights: 2 },
  { event: 'Lanka XIV', participant: 'GoRingo', nights: 2 },
  { event: 'Lanka XV', participant: 'GoRingo', nights: 3 },
  { event: 'Lanka XVIII', participant: 'GoRingo', nights: 4 },
  { event: 'Lanka XIV', participant: 'Herge', nights: 2 },
  { event: 'Lanka XVIII', participant: 'Herge', nights: 4 },
  { event: 'Lanka XIII', participant: 'Mikorot', nights: 5 },
  { event: 'Lanka XV', participant: 'Mikorot', nights: 3 },
  { event: 'Lanka XVI', participant: 'Mikorot', nights: 5 },
  { event: 'Lanka XVII', participant: 'Mikorot', nights: 5 },
  { event: 'Lanka XVIII', participant: 'Mikorot', nights: 4 },
  { event: 'Lanka XIX', participant: 'Mikorot', nights: 5 },
  { event: 'Lanka XIII', participant: 'pankew', nights: 1 },
  { event: 'Lanka XIV', participant: 'pankew', nights: 4 },
  { event: 'Lanka XV', participant: 'pankew', nights: 4 },
  { event: 'Lanka XVI', participant: 'pankew', nights: 3 },
  { event: 'Lanka XVII', participant: 'pankew', nights: 3 },
  { event: 'Lanka XVIII', participant: 'pankew', nights: 3 },
  { event: 'Lanka XIX', participant: 'pankew', nights: 3 },
  { event: 'Lanka XIII', participant: 'štipec', nights: 4 },
  { event: 'Lanka XIV', participant: 'štipec', nights: 4 },
  { event: 'Lanka XV', participant: 'štipec', nights: 5 },
  { event: 'Lanka XVI', participant: 'štipec', nights: 5 },
  { event: 'Lanka XVII', participant: 'štipec', nights: 5 },
  { event: 'Lanka XVIII', participant: 'štipec', nights: 5 },
  { event: 'Lanka XIX', participant: 'štipec', nights: 5 },
  { event: 'Lanka XIII', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XIV', participant: 'Štajgi', nights: 4 },
  { event: 'Lanka XV', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XVI', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XVII', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XVIII', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XIX', participant: 'Štajgi', nights: 5 },
  { event: 'Lanka XIII', participant: 'Zodiak', nights: 4 },
  { event: 'Lanka XIV', participant: 'Zodiak', nights: 4 },
  { event: 'Lanka XV', participant: 'Zodiak', nights: 5 },
  { event: 'Lanka XVI', participant: 'Zodiak', nights: 5 },
  { event: 'Lanka XVII', participant: 'Zodiak', nights: 5 },
  { event: 'Lanka XVIII', participant: 'Zodiak', nights: 5 },
  { event: 'Lanka XIX', participant: 'Zodiak', nights: 5 },
]

async function main() {
  const participantNames = [...new Set(attendance.map(a => a.participant))]

  const userMap = {}
  const missing = []
  for (const name of participantNames) {
    const existing = await prisma.user.findFirst({
      where: { displayName: name },
    })
    if (existing) {
      userMap[name] = existing.id
      console.log(`  Nalezen: ${name} (id=${existing.id})`)
    } else {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    console.error(`\nChyba: Následující uživatelé nebyli nalezeni (podle displayName):`)
    console.error(`  ${missing.join(', ')}`)
    console.error(`Vytvořte je nejdřív nebo opravte jména v tomto skriptu.`)
    process.exit(1)
  }

  const partyMap = {}
  for (const p of parties) {
    const existing = await prisma.party.findFirst({
      where: { name: p.name },
    })
    if (existing) {
      partyMap[p.name] = existing.id
      console.log(`  Párty existuje: ${p.name} (id=${existing.id})`)
    } else {
      const party = await prisma.party.create({
        data: {
          name: p.name,
          location: p.location,
          startDate: new Date(p.startDate + 'T14:00:00Z'),
          endDate: new Date(p.endDate + 'T12:00:00Z'),
          placeStatus: 'confirmed',
        },
      })
      partyMap[p.name] = party.id
      console.log(`  Vytvořena: ${p.name} (id=${party.id})`)
    }
  }

  let created = 0
  let skipped = 0
  for (const att of attendance) {
    const userId = userMap[att.participant]
    const partyId = partyMap[att.event]
    if (!userId || !partyId) {
      console.error(`  Chybí data: ${att.participant} @ ${att.event}`)
      continue
    }

    const party = parties.find(p => p.name === att.event)
    const arrival = new Date(party.startDate + 'T14:00:00Z')
    const departure = new Date(arrival)
    departure.setUTCDate(departure.getUTCDate() + att.nights)
    departure.setUTCHours(12, 0, 0, 0)

    const existing = await prisma.attendance.findUnique({
      where: { userId_partyId: { userId, partyId } },
    })
    if (existing) {
      skipped++
      continue
    }

    await prisma.attendance.create({
      data: {
        userId,
        partyId,
        status: 'confirmed',
        arrival,
        departure,
        settled: true,
      },
    })
    created++
  }

  console.log(`\nHotovo! Vytvořeno ${created} účastí, přeskočeno ${skipped} (již existují).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
