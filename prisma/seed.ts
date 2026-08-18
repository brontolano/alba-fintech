import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding multi-tenant database...")

  // Create default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Pesantren Al-Bayan",
      subdomain: "demo",
      appName: "ALBA Finance",
      logo: null,
      primaryColor: "#022448",
      secondaryColor: "#10B981",
    },
  })

  // Create Units
  const unitKantor = await prisma.unit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Kantor" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Kantor",
      type: "Sederhana",
      retailEnabled: false,
    },
  })

  const unitKantin = await prisma.unit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Kantin" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Kantin",
      type: "Retail",
      retailEnabled: true,
    },
  })

  const unitKoperasi = await prisma.unit.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Koperasi" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Koperasi",
      type: "Retail",
      retailEnabled: true,
    },
  })

  const passwordHash = await bcrypt.hash("bismillah", 10)

  // Create Superadmin
  await prisma.user.upsert({
    where: { email: "admin@brontolano" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Super Admin",
      email: "admin@brontolano",
      passwordHash,
      role: "Superadmin",
    },
  })

  // Create Pimpinan
  await prisma.user.upsert({
    where: { email: "pimpinan@alba.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Pimpinan Pesantren",
      email: "pimpinan@alba.com",
      passwordHash,
      role: "Pimpinan",
    },
  })

  // Create Manager Kantin
  await prisma.user.upsert({
    where: { email: "manager@kantin.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      unitId: unitKantin.id,
      name: "Manager Kantin",
      email: "manager@kantin.com",
      passwordHash,
      role: "Manager",
    },
  })

  // Create Staff
  await prisma.user.upsert({
    where: { email: "staff@kantin.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      unitId: unitKantin.id,
      name: "Staff Kantin",
      email: "staff@kantin.com",
      passwordHash,
      role: "Staff",
    },
  })

  console.log("Seeding completed successfully.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })