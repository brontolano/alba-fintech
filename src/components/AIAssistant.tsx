'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Bot, X, Sparkles } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

export function AIAssistant() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Ada yang bisa dibantu soal keuangan, stok, atau laporan hari ini?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const tenantId = session?.user?.tenantId

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])

  const send = async () => {
    if (!input.trim() || loading || !tenantId) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }] }),
      })
      const data = await res.json()
      if (data.content) setMessages((m) => [...m, { role: 'assistant', content: data.content }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Gagal menghubungi AI. Coba lagi.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!tenantId) return null

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#022448] text-white shadow-xl flex items-center justify-center hover:bg-[#1e3a5f] transition-colors"
        aria-label={open ? 'Tutup AI Assistant' : 'Buka AI Assistant'}
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e3e2e6] flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#022448] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-[#022448] text-white rounded-br-none'
                      : 'bg-[#f4f3f7] text-[#1a1c1e] rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-[#e3e2e6] p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Tanya soal transaksi, stok, laporan..."
                disabled={loading}
                className="flex-1 bg-[#f4f3f7] border-0 rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#16677a] focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-2xl bg-[#022448] text-white flex items-center justify-center hover:bg-[#1e3a5f] transition-colors disabled:opacity-50"
              >
                <Send className="w-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}