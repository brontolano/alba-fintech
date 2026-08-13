'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, User } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function AIAssistantPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Halo! Saya adalah asisten ALBA Finance. Saya dapat membantu Anda dengan saldo, transaksi, stok, approval, dan laporan.', timestamp: new Date().toISOString() }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }
  }, [session, router])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }])

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: data.timestamp }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan. Coba lagi.', timestamp: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-[#faf9fc] text-[#1a1c1e] font-body pb-28">
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#022448] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#022448]">Asisten AI</h1>
            <p className="text-xs text-[#43474e]">Bantuan keuangan pintar</p>
          </div>
        </div>

        <div className="space-y-4 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[#022448] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-[#022448] text-white' : 'bg-white border border-[#eeedf1] text-[#1a1c1e]'}`}>
                <p>{m.content}</p>
                <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70' : 'text-[#43474e]'}`}>
                  {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[#f4f3f7] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#43474e]" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#022448] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-[#eeedf1] rounded-2xl px-4 py-3 text-sm text-[#43474e]">
                Mengetik...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#faf9fc] border-t border-[#eeedf1] px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Tanyakan tentang keuangan..."
              className="flex-1 bg-white border border-[#e3e2e6] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#022448]"
            />
            <button onClick={send} disabled={loading || !input.trim()} className="bg-[#022448] text-white p-2 rounded-full disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
