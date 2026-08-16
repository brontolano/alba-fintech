import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { message } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    // Gather DB context for smart answers
    const [txCount, pendingApprovals, lowStock, totalUsers] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: "Pending" } }),
      prisma.inventoryItem.count({ where: { stock: { lte: 5 } } }),
      prisma.user.count(),
    ]).catch(() => [0, 0, 0, 0])

    const dbContext = `Context Sistem ALBA Finance saat ini: Total transaksi tercatat: ${txCount}, Transaksi pending approval: ${pendingApprovals}, Barang stok kritis (<=5): ${lowStock}, Total pengguna aktif: ${totalUsers}, Unit pengguna login: ${session.user.unit}, Role: ${session.user.role}.`

    const apiUrl = process.env.LLM_API_URL || "https://openrouter.ai/api/v1/chat/completions"
    const apiKey = process.env.LLM_API_KEY
    const model = process.env.LLM_MODEL || "meta-llama/llama-3.1-8b-instruct:free"

    if (apiKey) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content: `Kamu adalah asisten AI resmi ALBA Finance. Bantu pengguna mengelola keuangan, transaksi, stok inventori, dan approval. Jawab dalam Bahasa Indonesia yang profesional, ramah, dan ringkas. Gunakan data konteks sistem berikut jika relevan:\n${dbContext}`,
              },
              { role: "user", content: message },
            ],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const reply = data.choices?.[0]?.message?.content?.trim() || "Maaf, respons kosong."
          return NextResponse.json({ reply, timestamp: new Date().toISOString() })
        }
      } catch (err) {
        console.error("OpenRouter API error:", err)
      }
    }

    // Fallback rule-based smart answer with DB context
    const lower = message.toLowerCase()
    let reply = `Halo ${session.user.name}! Saya asisten ALBA Finance. Saat ini tercatat ${txCount} transaksi dan ${pendingApprovals} approval menunggu. Ada yang bisa saya bantu?`

    if (lower.includes("saldo") || lower.includes("balance") || lower.includes("laporan")) {
      reply = `Total transaksi tercatat dalam sistem adalah ${txCount}. Anda dapat melihat laporan detail per unit melalui menu Laporan di dashboard.`
    } else if (lower.includes("transaksi") || lower.includes("pencatatan")) {
      reply = `Ada ${txCount} total transaksi. Anda bisa mencatat transaksi baru melalui menu Transaksi.`
    } else if (lower.includes("stok") || lower.includes("barang") || lower.includes("inventory")) {
      reply = `Terdapat ${lowStock} barang dengan stok kritis (<=5) di inventori saat ini. Cek menu Inventori untuk detailnya.`
    } else if (lower.includes("approval") || lower.includes("persetujuan") || lower.includes("pending")) {
      reply = `Saat ini ada ${pendingApprovals} transaksi yang berstatus Pending dan memerlukan persetujuan.`
    } else if (lower.includes("bantuan") || lower.includes("help") || lower.includes("fitur")) {
      reply = "Saya dapat membantu menjawab pertanyaan seputar saldo, rekap transaksi, status approval, stok inventori, dan panduan penggunaan aplikasi ALBA Finance."
    }

    return NextResponse.json({ reply, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("AI assistant error:", error)
    return NextResponse.json({ error: "Failed to process" }, { status: 500 })
  }
}
