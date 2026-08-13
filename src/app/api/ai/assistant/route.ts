import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { message, context } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: `Kamu adalah asisten ALBA Finance. Bantu pengguna dengan saldo, transaksi, stok, approval, dan laporan keuangan. Jawab dalam Bahasa Indonesia. Jika tidak yakin, arahkan ke menu yang tepat di aplikasi.`,
              },
              { role: "user", content: message },
            ],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const reply = data.choices?.[0]?.message?.content?.trim() || "Maaf, respons kosong."
          return NextResponse.json({ reply, context: context || {}, timestamp: new Date().toISOString() })
        }
      } catch {
        // fall through to rule-based fallback
      }
    }

    const lower = message.toLowerCase()
    let reply = "Maaf, saya belum mengerti. Coba tanyakan tentang: saldo, transaksi, stok, atau approval."

    if (lower.includes("saldo") || lower.includes("balance")) {
      reply = "Saldo gabungan dapat dilihat di Dashboard. Untuk detail per unit, buka menu Laporan."
    } else if (lower.includes("transaksi") || lower.includes("transaction")) {
      reply = "Transaksi baru dapat dicatat di menu Transaksi. Status persetujuan bisa dilihat di menu Persetujuan."
    } else if (lower.includes("stok") || lower.includes("inventory")) {
      reply = "Stok barang dapat dilihat di menu Inventori. Notifikasi stok kritis akan muncul di Dashboard."
    } else if (lower.includes("approval") || lower.includes("persetujuan")) {
      reply = "Menu Persetujuan berisi transaksi yang menunggu review. Anda bisa approve/reject dari sana."
    } else if (lower.includes("bantuan") || lower.includes("help")) {
      reply = "Saya dapat membantu dengan: saldo, transaksi, stok, approval, dan laporan keuangan."
    }

    return NextResponse.json({ reply, context: context || {}, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("AI assistant error:", error)
    return NextResponse.json({ error: "Failed to process" }, { status: 500 })
  }
}
