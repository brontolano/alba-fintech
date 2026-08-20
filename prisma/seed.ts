import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // Hash password untuk semua user (default: "password123")
  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: "Pesantren Al-Basyariyyah" },
    update: {},
    create: {
      name: "Pesantren Al-Basyariyyah",
      appName: "ALBA Finance",
      primaryColor: "#1E3A5F",
      secondaryColor: "#10B981",
      subdomain: "albasyariyyah",
      activeModules: "transactions,reconciliation,retail,ai,inventory",
      isActive: true,
    },
  });
  console.log("✅ Tenant created:", tenant.name);

  // 2. Create Units
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Kantor" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Kantor",
        type: "Sederhana",
        retailEnabled: false,
        description: "Unit administrasi dan keuangan umum",
        balance: 0,
      },
    }),
    prisma.unit.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Kantin" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Kantin",
        type: "Retail",
        retailEnabled: true,
        description: "Unit retail makanan/minuman",
        balance: 0,
      },
    }),
    prisma.unit.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Koperasi" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Koperasi",
        type: "Retail",
        retailEnabled: true,
        description: "Unit retail kebutuhan santri",
        balance: 0,
      },
    }),
  ]);
  console.log("✅ Units created:", units.map((u) => u.name).join(", "));

  const [unitKantor, unitKantin, unitKoperasi] = units;

  // 3. Create Users
  const users = await Promise.all([
    // Superadmin (global)
    prisma.user.upsert({
      where: { email: "superadmin@alba.app" },
      update: {},
      create: {
        tenantId: null,
        email: "superadmin@alba.app",
        passwordHash,
        name: "Super Admin",
        role: "Superadmin",
        isActive: true,
      },
    }),
    // Pimpinan
    prisma.user.upsert({
      where: { email: "pimpinan@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "pimpinan@alba.app",
        passwordHash,
        name: "Kyai Pimpinan",
        role: "Pimpinan",
        isActive: true,
      },
    }),
    // Manager Kantor
    prisma.user.upsert({
      where: { email: "manager.kantor@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "manager.kantor@alba.app",
        passwordHash,
        name: "Ustadz Manager Kantor",
        role: "Manager",
        unitId: unitKantor.id,
        isActive: true,
      },
    }),
    // Staff Kantor
    prisma.user.upsert({
      where: { email: "staff.kantor@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "staff.kantor@alba.app",
        passwordHash,
        name: "Santri Staff Kantor",
        role: "Staff",
        unitId: unitKantor.id,
        isActive: true,
      },
    }),
    // Manager Kantin
    prisma.user.upsert({
      where: { email: "manager.kantin@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "manager.kantin@alba.app",
        passwordHash,
        name: "Ustadz Manager Kantin",
        role: "Manager",
        unitId: unitKantin.id,
        isActive: true,
      },
    }),
    // Staff Kantin
    prisma.user.upsert({
      where: { email: "staff.kantin@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "staff.kantin@alba.app",
        passwordHash,
        name: "Santri Staff Kantin",
        role: "Staff",
        unitId: unitKantin.id,
        isActive: true,
      },
    }),
    // Manager Koperasi
    prisma.user.upsert({
      where: { email: "manager.koperasi@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "manager.koperasi@alba.app",
        passwordHash,
        name: "Ustadz Manager Koperasi",
        role: "Manager",
        unitId: unitKoperasi.id,
        isActive: true,
      },
    }),
    // Staff Koperasi
    prisma.user.upsert({
      where: { email: "staff.koperasi@alba.app" },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "staff.koperasi@alba.app",
        passwordHash,
        name: "Santri Staff Koperasi",
        role: "Staff",
        unitId: unitKoperasi.id,
        isActive: true,
      },
    }),
  ]);
  console.log("✅ Users created:", users.map((u) => `${u.name} (${u.role})`).join(", "));

  const [, pimpinan, mgrKantor, staffKantor, mgrKantin, staffKantin, mgrKoperasi, staffKoperasi] = users;

  // 4. Create Categories per Unit
  const categories = await Promise.all([
    // Kantor categories
    ...[
      { name: "Operasional", type: "Kredit" },
      { name: "Gaji Staff", type: "Kredit" },
      { name: "Listrik & Air", type: "Kredit" },
      { name: "ATK & Perlengkapan", type: "Kredit" },
      { name: "Donasi Masuk", type: "Debit" },
      { name: "Sumbangan Santri", type: "Debit" },
      { name: "Lain-lain Masuk", type: "Debit" },
    ].map((c) =>
      prisma.category.upsert({
        where: { tenantId_name_type: { tenantId: tenant.id, name: c.name, type: c.type } },
        update: {},
        create: { tenantId: tenant.id, unitId: unitKantor.id, ...c },
      })
    ),
    // Kantin categories
    ...[
      { name: "Jualan Makanan", type: "Debit" },
      { name: "Jualan Minuman", type: "Debit" },
      { name: "Beli Bahan Baku", type: "Kredit" },
      { name: "Gas & Listrik", type: "Kredit" },
      { name: "Gaji Karyawan", type: "Kredit" },
    ].map((c) =>
      prisma.category.upsert({
        where: { tenantId_name_type: { tenantId: tenant.id, name: c.name, type: c.type } },
        update: {},
        create: { tenantId: tenant.id, unitId: unitKantin.id, ...c },
      })
    ),
    // Koperasi categories
    ...[
      { name: "Jualan Buku", type: "Debit" },
      { name: "Jualan Perlengkapan", type: "Debit" },
      { name: "Beli Stok Barang", type: "Kredit" },
      { name: "Operasional", type: "Kredit" },
    ].map((c) =>
      prisma.category.upsert({
        where: { tenantId_name_type: { tenantId: tenant.id, name: c.name, type: c.type } },
        update: {},
        create: { tenantId: tenant.id, unitId: unitKoperasi.id, ...c },
      })
    ),
  ]);
  console.log("✅ Categories created:", categories.length);

  // 5. Create Inventory Items (Kantin & Koperasi)
  const inventoryItems = await Promise.all([
    // Kantin items
    prisma.inventoryItem.upsert({
      where: { sku: "KTN-001" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKantin.id,
        name: "Nasi Goreng",
        sku: "KTN-001",
        category: "Makanan",
        buyPrice: 8000,
        sellPrice: 15000,
        unitOfMeasure: "pcs",
        stock: 50,
        minStock: 10,
        createdById: mgrKantin.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KTN-002" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKantin.id,
        name: "Mie Goreng",
        sku: "KTN-002",
        category: "Makanan",
        buyPrice: 7000,
        sellPrice: 13000,
        unitOfMeasure: "pcs",
        stock: 40,
        minStock: 10,
        createdById: mgrKantin.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KTN-003" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKantin.id,
        name: "Es Teh Manis",
        sku: "KTN-003",
        category: "Minuman",
        buyPrice: 2000,
        sellPrice: 5000,
        unitOfMeasure: "pcs",
        stock: 100,
        minStock: 20,
        createdById: mgrKantin.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KTN-004" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKantin.id,
        name: "Kopi Hitam",
        sku: "KTN-004",
        category: "Minuman",
        buyPrice: 3000,
        sellPrice: 7000,
        unitOfMeasure: "pcs",
        stock: 80,
        minStock: 15,
        createdById: mgrKantin.id,
      },
    }),
    // Koperasi items
    prisma.inventoryItem.upsert({
      where: { sku: "KOP-001" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKoperasi.id,
        name: "Al-Quran Kecil",
        sku: "KOP-001",
        category: "Buku",
        buyPrice: 45000,
        sellPrice: 65000,
        unitOfMeasure: "pcs",
        stock: 20,
        minStock: 5,
        createdById: mgrKoperasi.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KOP-002" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKoperasi.id,
        name: "Sarung Santri",
        sku: "KOP-002",
        category: "Perlengkapan",
        buyPrice: 35000,
        sellPrice: 55000,
        unitOfMeasure: "pcs",
        stock: 30,
        minStock: 5,
        createdById: mgrKoperasi.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KOP-003" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKoperasi.id,
        name: "Tas Ransel",
        sku: "KOP-003",
        category: "Perlengkapan",
        buyPrice: 120000,
        sellPrice: 180000,
        unitOfMeasure: "pcs",
        stock: 15,
        minStock: 3,
        createdById: mgrKoperasi.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku: "KOP-004" },
      update: {},
      create: {
        tenantId: tenant.id,
        unitId: unitKoperasi.id,
        name: "Sendok & Garpu",
        sku: "KOP-004",
        category: "Perlengkapan",
        buyPrice: 15000,
        sellPrice: 25000,
        unitOfMeasure: "set",
        stock: 50,
        minStock: 10,
        createdById: mgrKoperasi.id,
      },
    }),
  ]);
  console.log("✅ Inventory items created:", inventoryItems.length);

  // 6. Create Sample Transactions (optional)
  // Skip for now - will be created via UI

  console.log("🎉 Seeding completed!");
  console.log("\n📋 Demo Accounts (password: password123):");
  console.log("  Superadmin: superadmin@alba.app");
  console.log("  Pimpinan:   pimpinan@alba.app");
  console.log("  Mgr Kantor: manager.kantor@alba.app");
  console.log("  Staff Kantor: staff.kantor@alba.app");
  console.log("  Mgr Kantin: manager.kantin@alba.app");
  console.log("  Staff Kantin: staff.kantin@alba.app");
  console.log("  Mgr Koperasi: manager.koperasi@alba.app");
  console.log("  Staff Koperasi: staff.koperasi@alba.app");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Don't disconnect singleton
  });