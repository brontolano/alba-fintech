'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (res?.error) {
      setError('Email atau password salah')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] min-h-screen font-body antialiased selection:bg-[#1e3a5f] selection:text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#d5e3ff] opacity-30 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#8cd1e6] opacity-20 blur-3xl"></div>
      </div>

      {/* Main Container */}
      <main className="w-full max-w-[428px] min-h-[100dvh] md:min-h-0 md:h-[85vh] md:max-h-[850px] bg-white flex flex-col relative z-10 shadow-2xl md:rounded-[40px] overflow-hidden border-x md:border border-[#c4c6cf]/30 mx-auto justify-between md:justify-center p-8">
        <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
          {/* Logo */}
          <div className="mb-6 w-24 h-24">
            <img 
              alt="Logo Al-Basyariyah" 
              className="w-full h-full object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqntWAPKvOpBH8ZTaOsNnNivIk1ev_Wc-J5jk4PIhEK_ROBiBEdlNwXhd1m0B8IYjW4E-chjYrX0QBcc6rlBbvE0ttkFS-GaoHN_D7Y1tcuOiQ2fZySP1WArPce0kKBtOTazAr9Ek4oYsym78tOrN3oPZFKVTExlffXA8i1QVMnKQM374FKTjeSqI2qiQlWXNPXfM7wEc8wQyhctS_ncOq_7SSCdp74s-GGK4ElaLJYG-nH0hWfAAvOKdqDdxkcEDmlg"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#022448] mb-2">Masuk Ke Akun</h1>
            <p className="text-sm text-[#43474e] leading-relaxed">
              Sistem Manajemen Keuangan Terpadu<br />Pondok Pesantren Al-Basyariyyah
            </p>
          </div>

          {error && (
            <div className="w-full p-3 mb-4 text-sm text-[#93000a] bg-[#ffdad6] rounded-2xl text-center font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1a1c1e]" htmlFor="email">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#43474e] text-[20px]">person</span>
                <input 
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-[#faf9fc] border border-[#c4c6cf] focus:border-[#022448] focus:ring-1 focus:ring-[#022448] outline-none transition-all text-[#1a1c1e]" 
                  id="email" 
                  placeholder="nama@alba.id" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#1a1c1e]" htmlFor="password">Kata Sandi</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#43474e] text-[20px]">lock</span>
                <input 
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-[#faf9fc] border border-[#c4c6cf] focus:border-[#022448] focus:ring-1 focus:ring-[#022448] outline-none transition-all text-[#1a1c1e]" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <a className="text-sm font-medium text-[#022448] hover:opacity-80 transition-opacity" href="#">Lupa Kata Sandi?</a>
            </div>

            {/* Submit Button */}
            <button 
              className="mt-2 w-full h-12 bg-[#022448] hover:bg-[#1e3a5f] text-white font-semibold rounded-full flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]" 
              type="submit"
              disabled={loading}
            >
              <span className="material-symbols-outlined">login</span>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 w-full bg-[#f4f3f7] p-4 rounded-2xl border border-[#e3e2e6] text-center">
            <p className="text-xs font-bold text-[#022448] mb-2 uppercase tracking-wide">Akun Demo Cepat:</p>
            <div className="text-xs text-[#43474e] space-y-1 font-mono">
              <p onClick={() => { setEmail('pimpinan@alba.id'); setPassword('password123'); }} className="cursor-pointer hover:text-[#022448] transition-colors">
                👑 Pimpinan: <span className="underline">pimpinan@alba.id</span>
              </p>
              <p onClick={() => { setEmail('manager.kantin@alba.id'); setPassword('password123'); }} className="cursor-pointer hover:text-[#022448] transition-colors">
                🏢 Mgr Kantin: <span className="underline">manager.kantin@alba.id</span>
              </p>
              <p onClick={() => { setEmail('staff.kantin@alba.id'); setPassword('password123'); }} className="cursor-pointer hover:text-[#022448] transition-colors">
                👤 Staff Kantin: <span className="underline">staff.kantin@alba.id</span>
              </p>
              <p className="text-[10px] text-[#74777f] mt-1 italic">(Klik salah satu untuk isi otomatis)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[#43474e]">
          <p>© 2026 Yayasan Bumi Jannah Iliyyin.</p>
          <p className="opacity-70 mt-0.5">Amanah • Wadhah • Kifayah</p>
        </div>
      </main>
    </div>
  )
}
