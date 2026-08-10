'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera, Upload } from 'lucide-react'
import Link from 'next/link'

function TransactionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultType = searchParams.get('type') === 'kredit' ? 'Kredit' : 'Debit'
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: defaultType,
    amount: '',
    category: '',
    method: 'Tunai',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      {/* Type Selection */}
      <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'Debit' })}
          className={`py-2 text-sm font-medium rounded-lg transition ${
            formData.type === 'Debit' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pemasukan
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, type: 'Kredit' })}
          className={`py-2 text-sm font-medium rounded-lg transition ${
            formData.type === 'Kredit' 
              ? 'bg-white text-rose-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pengeluaran
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Nominal (Rp)</label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          className="w-full px-0 py-2 text-3xl font-bold font-mono bg-transparent border-b-2 border-slate-200 focus:border-[#1E3A5F] outline-none transition-colors"
          placeholder="0"
          required
        />
      </div>

      {/* Details */}
      <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            placeholder="Tulis kategori manual (cth: Penjualan Sembako, Belanja ATK)"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, method: 'Tunai' })}
              className={`py-2.5 text-sm font-medium rounded-xl border transition ${
                formData.method === 'Tunai' 
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tunai
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, method: 'Transfer' })}
              className={`py-2.5 text-sm font-medium rounded-xl border transition ${
                formData.method === 'Transfer' 
                  ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Transfer
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
            placeholder="Tambahkan catatan..."
            rows={3}
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Bukti Transaksi</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="flex flex-col items-center justify-center gap-2 h-24 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 hover:bg-slate-50 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition">
            <Camera className="w-6 h-6" />
            <span className="text-xs font-medium">Ambil Foto</span>
          </button>
          <button type="button" className="flex flex-col items-center justify-center gap-2 h-24 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 hover:bg-slate-50 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition">
            <Upload className="w-6 h-6" />
            <span className="text-xs font-medium">Unggah File</span>
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#1E3A5F] hover:bg-[#152a45] text-white py-6 rounded-xl text-base font-medium mt-6"
        disabled={loading}
      >
        {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
      </Button>
    </form>
  )
}

export default function NewTransactionPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Catat Transaksi</h1>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat form...</div>}>
        <TransactionForm />
      </Suspense>
    </div>
  )
}
