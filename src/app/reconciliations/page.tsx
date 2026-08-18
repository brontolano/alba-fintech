import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`
}

export default async function ReconciliationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const where: any = {}
  if (session.user.tenantId) where.tenantId = session.user.tenantId
  if (session.user.role === "Manager" && session.user.unitId) {
    where.unitId = session.user.unitId
  }

  const reconciliations = await prisma.reconciliation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { 
      user: { select: { name: true, email: true } }, 
      unit: { select: { id: true, name: true } },
    },
  })

  const pendingTotal = reconciliations
    .filter((r) => r.status === "Pending")
    .reduce((sum, r) => sum + Number(r.difference), 0)

  return (
    <div className="bg-[#faf9fc] text-[#1a1c1e] font-body min-h-screen pb-28">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-white z-40 shadow-sm flex items-center justify-center px-6 py-3 max-w-[1280px] mx-auto">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold overflow-hidden hover:opacity-90 transition-opacity">
              {session.user.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{(session.user.name || "AL").charAt(0).toUpperCase()}</span>
              )}
            </Link>
            <h1 className="text-xl font-bold text-[#022448]">ALBA Finance</h1>
          </div>
          <button aria-label="Notifications" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e9e7eb] transition-colors text-[#022448]">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-5 space-y-5">
        {/* Summary Card */}
        <section className="bg-[#022448] text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[150px]">account_balance_wallet</span>
          </div>
          <div className="relative z-10">
            <h2 className="text-xl mb-2 font-semibold text-[#adc8f5]">Menunggu Verifikasi</h2>
            <div className="text-3xl sm:text-4xl font-bold font-mono mb-3 tracking-tight">{formatRupiah(pendingTotal)}</div>
            <div className="flex items-center gap-2 text-[#adc8f5] text-sm">
              <span className="material-symbols-outlined text-base">business</span>
              <span>Dari {reconciliations.length} Unit</span>
            </div>
          </div>
        </section>

        {/* List Setoran */}
        <section className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-[#1a1c1e]">Daftar Setoran Unit</h3>
            <button className="text-[#022448] text-sm font-medium hover:underline">Lihat Semua</button>
          </div>

          {reconciliations.map((item) => {
            const iconName = item.unit?.name.toLowerCase().includes("kantin") ? "restaurant" : item.unit?.name.toLowerCase().includes("koperasi") ? "shopping_basket" : "storefront"
            const dateStr = new Date(item.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 border border-[#e3e2e6] shadow-sm transition-shadow hover:shadow-md ${
                  item.status === "Validated" ? "bg-[#faf9fc] opacity-75" : "bg-white"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      item.status === "Validated" ? "bg-[#e3e2e6] text-[#43474e]" : "bg-[#a2e7fd] text-[#1b697c]"
                    }`}>
                      <span className="material-symbols-outlined">{iconName}</span>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-[#1a1c1e]">Unit {item.unit?.name || "Unknown"}</h4>
                      <p className="text-xs text-[#43474e]">{dateStr}</p>
                    </div>
                  </div>

                  {item.status === "Pending" ? (
                    <div className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">pending</span>
                      Menunggu
                    </div>
                  ) : (
                    <div className="bg-[#e9e7eb] text-[#1a1c1e] px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#16677a] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Diverifikasi
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-t border-[#e3e2e6] pt-3">
                  <div className="space-y-1">
                    <p className="text-xs text-[#43474e]">Kas Fisik</p>
                    <p className="text-lg font-bold font-mono text-[#1a1c1e]">{formatRupiah(Number(item.physicalCash))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#43474e]">Saldo Sistem</p>
                    <p className="text-lg font-bold font-mono text-[#1a1c1e]">{formatRupiah(Number(item.digitalBalance))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#43474e]">Selisih</p>
                    <p className={`text-xl font-bold font-mono ${Number(item.difference) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {Number(item.difference) >= 0 ? "+" : ""}{formatRupiah(Number(item.difference))}
                    </p>
                  </div>

                  {item.status === "Pending" && session.user.role !== "Staff" ? (
                    <div className="flex gap-2 sm:ml-auto">
                      <button
                        className="bg-emerald-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                        onClick={async () => {
                          await fetch(`/api/reconciliations/${item.id}/approve`, { method: "POST" })
                          window.location.reload()
                        }}
                      >
                        Setujui
                      </button>
                      <button
                        className="bg-rose-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm"
                        onClick={async () => {
                          await fetch(`/api/reconciliations/${item.id}/reject`, { method: "POST" })
                          window.location.reload()
                        }}
                      >
                        Tolak
                      </button>
                    </div>
                  ) : item.status === "Validated" ? (
                    <div className="text-right">
                      <p className="text-xs text-[#16677a] font-semibold">Diverifikasi oleh Manager</p>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}