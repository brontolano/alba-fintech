import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // Pimpinan
  await prisma.user.upsert({
    where: { email: 'pimpinan@alba.id' },
    update: {},
    create: {
      email: 'pimpinan@alba.id',
      name: 'Pimpinan Pesantren',
      passwordHash,
      role: 'Pimpinan',
      unit: 'All',
    },
  })

  // Manager Kantin
  await prisma.user.upsert({
    where: { email: 'manager.kantin@alba.id' },
    update: {},
    create: {
      email: 'manager.kantin@alba.id',
      name: 'Manager Kantin',
      passwordHash,
      role: 'Manager',
      unit: 'Kantin',
    },
  })

  // Staff Kantin
  await prisma.user.upsert({
    where: { email: 'staff.kantin@alba.id' },
    update: {},
    create: {
      email: 'staff.kantin@alba.id',
      name: 'Staff Kantin',
      passwordHash,
      role: 'Staff',
      unit: 'Kantin',
    },
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
