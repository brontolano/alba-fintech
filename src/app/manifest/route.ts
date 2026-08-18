import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  let appName = "ALBA Finance"
  let primaryColor = "#022448"
  let logoUrl = "/icon-192.png"
  
  if (session?.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { appName: true, primaryColor: true, logo: true },
    })
    if (tenant) {
      appName = tenant.appName || appName
      primaryColor = tenant.primaryColor || primaryColor
      if (tenant.logo) logoUrl = tenant.logo
    }
  }

  const manifest = {
    name: appName,
    short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
    description: `Aplikasi keuangan ${appName}`,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf9fc",
    theme_color: primaryColor,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
    screenshots: [],
    categories: ["finance", "business"],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard", description: "Lihat ringkasan keuangan" },
      { name: "Transaksi Baru", url: "/transactions/new", description: "Input transaksi cepat" },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}