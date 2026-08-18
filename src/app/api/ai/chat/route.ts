import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { AI_CONFIG } from "@/lib/ai-config"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messages, context } = await req.json()
  const tenantId = session.user.tenantId
  const role = session.user.role
  const unitId = session.user.unitId

  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 })

  let systemPrompt = `Kamu adalah AI Assistant untuk ALBA Finance (white-label multi-tenant).
Tenant ID: ${tenantId}
User: ${session.user.name} (${role})
Unit ID: ${unitId || "N/A"}

Kamu membantu user dengan pertanyaan keuangan, transaksi, stok, laporan, dll.
Jawab dalam Bahasa Indonesia, singkat, praktis, dan sopan.`

  if (context) {
    systemPrompt += `\n\nKonteks tambahan: ${JSON.stringify(context)}`
  }

  try {
    const res = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: "AI request failed", detail: err }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ content: data.choices?.[0]?.message?.content || "" })
  } catch (e) {
    return NextResponse.json({ error: "Network error", detail: String(e) }, { status: 500 })
  }
}