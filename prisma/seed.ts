import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed SystemConfig
  const config = await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appName: 'ALBA Finance',
      appLogo: null,
      updatedAt: new Date(),
    },
  })
  console.log('SystemConfig seeded:', config)

  // Seed default categories per unit
  const units = ['Kantor', 'Kantin', 'Koperasi']
  for (const unit of units) {
    await prisma.category.upsert({
      where: { id: unit === 'Kantor' ? 1 : unit === 'Kantin' ? 2 : 3 },
      update: {},
      create: {
        name: unit === 'Kantor' ? 'Operasional Kantor' : unit === 'Kantin' ? 'Penjualan Kantin' : 'Koperasi',
        type: 'Debit',
        unit,
      },
    })
  }
  console.log('Categories seeded')

  // Seed default Pimpinan user
  const exists = await prisma.user.findFirst()
  if (!exists) {
    const hash = await bcrypt.hash('pimpinan123', 10)
    const pimpinan = await prisma.user.create({
      data: {
        email: 'pimpinan@alba.local',
        passwordHash: hash,
        name: 'Pimpinan',
        role: 'Pimpinan',
        unit: 'All',
        unitType: 'Sederhana',
        retailModuleEnabled: false,
      },
    })
    console.log('Pimpinan seeded:', pimpinan.email)
  } else {
    console.log('Users already exist, skip seeding')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
