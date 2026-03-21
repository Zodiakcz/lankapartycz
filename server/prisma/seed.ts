import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        username: 'admin',
        displayName: 'Admin',
        passwordHash: hash,
        role: 'admin',
      },
    })
    console.log('Vytvořen admin účet (admin / admin123)')
  }

  // Default packing items
  const itemCount = await prisma.packingItem.count()
  if (itemCount === 0) {
    await prisma.packingItem.createMany({
      data: [
        { name: 'PC / Notebook', category: 'hardware' },
        { name: 'Monitor', category: 'hardware' },
        { name: 'Klávesnice + myš', category: 'hardware' },
        { name: 'Sluchátka / headset', category: 'hardware' },
        { name: 'Prodlužovačka', category: 'hardware' },
        { name: 'Ethernet kabel', category: 'hardware' },
        { name: 'Spací pytel / peřina', category: 'general' },
        { name: 'Polštář', category: 'general' },
        { name: 'Karimatka / matrace', category: 'general' },
        { name: 'Hygienické potřeby', category: 'general' },
        { name: 'Ručník', category: 'general' },
        { name: 'Přezůvky', category: 'general' },
        { name: 'Chipsy / snacky', category: 'food' },
        { name: 'Pití', category: 'food' },
      ],
    })
    console.log('Vytvořeny výchozí položky k zabalení')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
