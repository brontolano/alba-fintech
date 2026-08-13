'use client'

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Bell, X, CheckCheck } from "lucide-react"
import Link from "next/link"

type Notification = {
  id: number
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Baru saja"
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      console.error("Gagal fetch notifikasi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [session, fetchNotifications])

  const markAsRead = async (notificationId?: number, markAll = false) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, markAllRead: markAll }),
      })
      fetchNotifications()
    } catch {
      console.error("Gagal mark as read")
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "approval": return <span className="material-symbols-outlined text-amber-600">task_alt</span>
      case "stock": return <span className="material-symbols-outlined text-rose-600">warning</span>
      case "transaction": return <span className="material-symbols-outlined text-emerald-600">receipt_long</span>
      default: return <span className="material-symbols-outlined text-blue-600">info</span>
    }
  }

  if (!session) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9e7eb] transition-colors text-[#022448]"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#eeedf1] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#eeedf1]">
            <h3 className="font-bold text-[#1a1c1e]">Notifikasi</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead(undefined, true)}
                  className="text-xs text-[#1e3a5f] font-semibold hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f4f3f7] text-[#43474e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#43474e]">Memuat...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-[#43474e]">
                <Bell className="w-10 h-10 mx-auto mb-2 text-[#c4c6cf]" />
                <p className="text-sm">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y divide-[#eeedf1]">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-[#faf9fc] transition-colors ${
                      !notif.read ? "bg-[#f0f7ff]" : ""
                    }`}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#eef2ff] flex items-center justify-center">
                        {typeIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${!notif.read ? "text-[#1a1c1e]" : "text-[#43474e]"}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-[#43474e] mt-0.5 truncate">{notif.message}</p>
                        <p className="text-[10px] text-[#74777f] mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                      {!notif.read && (
                        <CheckCheck className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[#eeedf1]">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-semibold text-[#1e3a5f] hover:underline"
            >
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}