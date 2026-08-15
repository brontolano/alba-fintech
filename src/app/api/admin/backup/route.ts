import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.role !== "Pimpinan" && session.user.role !== "Superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sql: string[] = []
  sql.push("-- ALBA Finance Database Backup")
  sql.push(`-- Generated: ${new Date().toISOString()}`)
  sql.push("BEGIN TRANSACTION;")
  sql.push("")

  const tables: Record<string, string[]> = {
    SystemConfig: ["id", "appName", "appLogo", "updatedAt"],
    User: ["id", "email", "passwordHash", "name", "image", "role", "unit", "unitType", "retailModuleEnabled", "createdAt"],
    Transaction: ["id", "userId", "transactionDate", "unit", "type", "method", "category", "amount", "description", "photoUrl", "status", "approvedById", "approvedAt", "createdAt", "updatedAt"],
    Approval: ["id", "transactionId", "approverId", "level", "status", "notes", "createdAt"],
    Reconciliation: ["id", "userId", "reconciliationDate", "unit", "physicalCash", "digitalBalance", "difference", "notes", "status", "createdAt"],
    Category: ["id", "name", "type", "unit", "createdAt"],
    Supplier: ["id", "name", "contact", "email", "phone", "address", "unitName", "createdAt"],
    PurchaseOrder: ["id", "supplierId", "unitName", "orderDate", "totalAmount", "status", "receivedAt", "notes", "createdById", "createdAt"],
    PurchaseOrderItem: ["id", "purchaseOrderId", "inventoryId", "quantity", "unitPrice", "subtotal"],
    InventoryItem: ["id", "name", "sku", "category", "imageUrl", "buyPrice", "sellPrice", "unit", "stock", "minStock", "unitName", "createdById", "createdAt", "updatedAt"],
    StockMovement: ["id", "inventoryId", "type", "quantity", "note", "createdById", "createdAt"],
    StockOpname: ["id", "inventoryId", "physicalStock", "difference", "note", "createdById", "createdAt"],
    PosSale: ["id", "unitName", "totalAmount", "paymentMethod", "status", "refundOfId", "shiftId", "createdById", "createdAt"],
    PosSaleItem: ["id", "posSaleId", "inventoryId", "quantity", "priceAtSale", "subtotal", "createdAt"],
    CashierShift: ["id", "unitName", "openedBy", "closedBy", "openedAt", "closedAt", "openingCash", "closingCash", "cashDifference", "note", "status"],
    AuditLog: ["id", "actorId", "action", "entity", "entityId", "metadata", "ip", "userAgent", "createdAt"],
    Notification: ["id", "userId", "title", "message", "type", "read", "createdAt"],
  }

  for (const [table, columns] of Object.entries(tables)) {
    const rows = await (prisma as unknown as Record<string, (args: unknown) => Promise<unknown[]>>)[
      table.toLowerCase()
    ]({})

    if (!Array.isArray(rows) || rows.length === 0) continue

    sql.push(`-- Table: ${table}`)
    for (const row of rows as Record<string, unknown>[]) {
      const values = columns
        .map((col) => {
          const val = row[col]
          if (val === null || val === undefined) return "NULL"
          if (typeof val === "number") return String(val)
          if (typeof val === "boolean") return val ? "1" : "0"
          if (val instanceof Date) return `'${val.toISOString()}'`
          return `'${String(val).replace(/'/g, "''")}'`
        })
        .join(", ")
      sql.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values});`)
    }
    sql.push("")
  }

  sql.push("COMMIT;")

  const backupSql = sql.join("\n")
  return NextResponse.json({ sql: backupSql, filename: `backup-${new Date().toISOString().split("T")[0]}.sql` })
}