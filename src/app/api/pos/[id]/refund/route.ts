import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { canUseRetail } from "@/lib/enums"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const saleId = Number(id)
  const sale = await prisma.posSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  })

  if (!sale) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
  }

  if (sale.status === "Refunded") {
    return NextResponse.json({ error: "Transaksi sudah diretur" }, { status: 400 })
  }

  if (sale.status === "Void") {
    return NextResponse.json({ error: "Transaksi sudah dibatalkan" }, { status: 400 })
  }

  const body = (await req.json()) as { reason?: string; fullRefund?: boolean; itemIds?: number[] }
  const isFull = body.fullRefund !== false
  const reason = body.reason || "Retur/void"

  // Determine which items to refund
  let refundItems = sale.items
  if (!isFull && Array.isArray(body.itemIds) && body.itemIds.length > 0) {
    refundItems = sale.items.filter((it) => body.itemIds!.includes(it.id))
    if (refundItems.length === 0) {
      return NextResponse.json({ error: "Tidak ada item yang diretur" }, { status: 400 })
    }
  }

  const refundTotal = refundItems.reduce((acc, it) => acc + Number(it.subtotal), 0)

  // Create refund record
  const refund = await prisma.posSale.create({
    data: {
      unitName: sale.unitName,
      paymentMethod: sale.paymentMethod,
      totalAmount: -refundTotal,
      status: "Refunded",
      refundOfId: sale.id,
      createdById: Number(session.user.id),
      items: {
        create: refundItems.map((it) => ({
          inventoryId: it.inventoryId,
          quantity: -it.quantity,
          priceAtSale: it.priceAtSale,
          subtotal: -it.subtotal,
        })),
      },
    },
    include: { items: true },
  })

  // Restore stock for refunded items
  for (const it of refundItems) {
    await prisma.inventoryItem.update({
      where: { id: it.inventoryId },
      data: { stock: { increment: it.quantity } },
    })
  }

  // If full refund, mark original as refunded
  if (isFull) {
    await prisma.posSale.update({
      where: { id: saleId },
      data: { status: "Refunded" },
    })
  }

  return NextResponse.json({
    ...refund,
    totalAmount: Number(refund.totalAmount),
    items: refund.items.map((x) => ({
      ...x,
      priceAtSale: Number(x.priceAtSale),
      subtotal: Number(x.subtotal),
    })),
  })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const saleId = Number(id)
  const sale = await prisma.posSale.findUnique({
    where: { id: saleId },
    include: { items: true },
  })

  if (!sale) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
  }

  if (sale.status === "Void") {
    return NextResponse.json({ error: "Transaksi sudah dibatalkan" }, { status: 400 })
  }

  // Void: restore stock, mark as void
  for (const it of sale.items) {
    await prisma.inventoryItem.update({
      where: { id: it.inventoryId },
      data: { stock: { increment: it.quantity } },
    })
  }

  await prisma.posSale.update({
    where: { id: saleId },
    data: { status: "Void" },
  })

  return NextResponse.json({ success: true, message: "Transaksi berhasil dibatalkan" })
}