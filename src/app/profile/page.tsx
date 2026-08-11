'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Camera, Save, Refresh } from "lucide-react"

type UserProfile = {
  name?: string | null
  email?: string | null
  role?: string
  unit?: string
  unitType?: string | null
  image?: string | null
  retailModuleEnabled?: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const baseFallback: UserProfile = {
    name: "H. Ahmad Fauzi, M.Ag.",
    email: "ahmad.fauzi@albasyariyyah.sch.id",
    role: "Kepala Keuangan",
    unit: "Kantor Pusat",
    unitType: null,
    image: undefined,
    retailModuleEnabled: false,
  }

  const user: UserProfile = profile ?? session?.user ?? baseFallback
  const roleTitle =
    user.role === "Manager"
      ? "Profil Manager"
      : user.role === "Staff"
        ? "Profil Staf"
        : user.role === "Pimpinan"
          ? "Profil Pimpinan"
          : "Profil"

  useEffect(() => {
    if (!session) {
      router.replace("/login")
      return
    }

    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" })

        if (res.status === 401) {
          router.replace("/login")
          return
        }

        if (!res.ok) {
          setError("Gagal memuat profil.")
          return
        }

        const data = (await res.json()) as UserProfile
        if (!cancelled) {
          setProfile(data)
        }
      } catch {
        if (!cancelled) setError("Gagal memuat profil.")
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [session, router])

  async function onToggleRetail(nextChecked: boolean) {
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailModuleEnabled: nextChecked }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal menyimpan pengaturan." }))
        setError(err.error || "Gagal menyimpan pengaturan.")
        return
      }

      const updated = (await res.json()) as UserProfile
      setProfile(updated)
      await update()
    } catch {
      setError("Gagal menyimpan pengaturan.")
    } finally {
      setSaving(false)
    }
  }

  async function onFileSelected(file?: File) {
    if (!file) return
    setUploading(true)
    setError("")

    try {
      const form = new FormData()
      form.append("image", file)

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: form,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal mengunggah foto profil." }))
        setError(err.error || "Gagal mengunggah foto profil.")
        return
      }

      const updated = (await res.json()) as UserProfile
      setProfile(updated)
      await update()
    } catch {
      setError("Gagal mengunggah foto profil.")
    } finally {
      setUploading(false)
    }
  }

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const oldPassword = (form.elements.namedItem("old_password") as HTMLInputElement | null)?.value || ""
    const newPassword = (form.elements.namedItem("new_password") as HTMLInputElement | null)?.value || ""
    const confirmPassword = (form.elements.namedItem("confirm_password") as HTMLInputElement | null)?.value || ""

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Semua kolom kata sandi wajib diisi.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal memperbarui kata sandi." }))
        setError(err.error || "Gagal memperbarui kata sandi.")
        return
      }

      form.reset()
      alert("Kata sandi berhasil diperbarui.")
    } catch {
      setError("Gagal memperbarui kata sandi.")
    } finally {
      setSaving(false)
    }
  }

  if (!session) return null

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] font-body min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#faf9fc] dark:bg-[#2f3033] shadow-sm flex justify-between items-center px-4 h-16 max-w-[1280px] mx-auto">
        <Link href="/dashboard" className="flex items-center cursor-pointer active:scale-95 duration-150 hover:bg-[#e9e7eb] p-2 rounded-full transition-colors text-[#43474e]">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1 className="text-2xl font-bold text-[#022448] tracking-tight">{roleTitle}</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 px-4 max-w-[1280px] mx-auto md:px-6">
        {/* Profile Header */}
        <section className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-4 group">
            {user.image ? (
              <img alt="Profile Picture" className="w-full h-full object-cover rounded-full shadow-sm border-4 border-white" src={user.image} />
            ) : (
              <div className="w-full h-full rounded-full shadow-sm border-4 border-white bg-gradient-to-br from-[#022448] to-[#16677a] flex items-center justify-center text-white text-4xl font-bold">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 bg-[#022448] text-white p-2 rounded-full shadow-md hover:bg-[#1e3a5f] transition-colors focus:outline-none active:scale-95 duration-150 flex items-center justify-center"
              type="button"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                onFileSelected(file)
              }}
            />
          </div>
          {uploading && <p className="text-xs text-[#43474e] mb-2">Mengunggah foto...</p>}
          <h2 className="text-xl font-bold text-[#1a1c1e] text-center">{user.name || "H. Ahmad Fauzi, M.Ag."}</h2>
          <p className="text-base text-[#43474e] text-center mt-1">{user.role || "Kepala Keuangan"}</p>
        </section>

        {error ? <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-4 text-sm mb-6">{error}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info Section */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1]">
            <h3 className="text-xl font-bold text-[#1a1c1e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#022448]">badge</span>
              Informasi Profil
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#43474e] uppercase tracking-wider mb-1">Nama Lengkap</span>
                <div className="bg-[#f4f3f7] p-3 rounded-2xl text-base text-[#1a1c1e]">{user.name || "H. Ahmad Fauzi, M.Ag."}</div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#43474e] uppercase tracking-wider mb-1">Email / Username</span>
                <div className="bg-[#f4f3f7] p-3 rounded-2xl text-base text-[#1a1c1e]">{user.email || "ahmad.fauzi@albasyariyyah.sch.id"}</div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#43474e] uppercase tracking-wider mb-1">Unit / Peran</span>
                <div className="bg-[#f4f3f7] p-3 rounded-2xl text-base text-[#1a1c1e]">
                  {user.unit || "Kantor Pusat"} / <span className="font-semibold text-[#16677a]">{user.role}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Account Security Section */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1]">
            <h3 className="text-xl font-bold text-[#1a1c1e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#022448]">security</span>
              Keamanan Akun
            </h3>
            <p className="text-sm text-[#43474e] mb-4">Ganti kata sandi Anda secara berkala untuk menjaga keamanan akun.</p>
            <form className="space-y-4" onSubmit={onChangePassword}>
              <div>
                <label className="block text-sm text-[#43474e] mb-1" htmlFor="old_password">Kata Sandi Lama</label>
                <input className="w-full bg-[#f4f3f7] border-none rounded-2xl px-4 py-3 text-base text-[#1a1c1e] focus:ring-2 focus:ring-[#16677a] focus:outline-none" id="old_password" placeholder="••••••••" type="password" />
              </div>
              <div>
                <label className="block text-sm text-[#43474e] mb-1" htmlFor="new_password">Kata Sandi Baru</label>
                <input className="w-full bg-[#f4f3f7] border-none rounded-2xl px-4 py-3 text-base text-[#1a1c1e] focus:ring-2 focus:ring-[#16677a] focus:outline-none" id="new_password" placeholder="••••••••" type="password" />
              </div>
              <div>
                <label className="block text-sm text-[#43474e] mb-1" htmlFor="confirm_password">Konfirmasi Kata Sandi Baru</label>
                <input className="w-full bg-[#f4f3f7] border-none rounded-2xl px-4 py-3 text-base text-[#1a1c1e] focus:ring-2 focus:ring-[#16677a] focus:outline-none" id="confirm_password" placeholder="••••••••" type="password" />
              </div>
              <button className="w-full mt-2 bg-[#022448] text-white text-base py-3 rounded-full hover:bg-[#1e3a5f] transition-colors shadow-sm focus:outline-none active:scale-95 duration-150 font-semibold" type="submit" disabled={saving}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </span>
              </button>
            </form>
          </section>
        </div>

        {/* Module Settings */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#eeedf1] mt-6">
          <h3 className="text-xl font-bold text-[#1a1c1e] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#022448]">settings_applications</span>
            Pengaturan Modul Unit
          </h3>
          <p className="text-sm text-[#43474e] mb-4">Aktifkan/nonaktifkan modul tambahan sesuai jenis unit Anda.</p>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-[#f4f3f7] rounded-2xl cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#16677a]">inventory_2</span>
                <div>
                  <p className="font-semibold text-[#1a1c1e]">Modul Retail (POS & Inventori)</p>
                  <p className="text-xs text-[#43474e]">Khusus unit usaha (Kantin/Koperasi)</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(user.retailModuleEnabled)}
                onChange={(e) => {
                  onToggleRetail(e.target.checked)
                }}
                disabled={user.role === "Pimpinan" || saving}
                className="w-5 h-5 accent-[#022448]"
              />
            </label>
            {user.role === "Pimpinan" && (
              <p className="text-xs text-[#43474e] text-center">Pimpinan tidak memerlukan toggle modul retail (akses penuh semua unit).</p>
            )}
          </div>
        </section>

        {/* Logout Section */}
        <section className="mt-8 flex justify-center pb-8">
          <Link href="/login" className="flex items-center gap-2 border border-[#ba1a1a] text-[#ba1a1a] text-base py-3 px-6 rounded-full hover:bg-[#ffdad6]/30 transition-colors active:scale-95 duration-150 font-semibold">
            <span className="material-symbols-outlined">logout</span>
            Keluar Aplikasi
          </Link>
        </section>
      </main>
    </div>
  )
}
