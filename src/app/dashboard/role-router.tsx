import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function DashboardRedirect() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role

  if (role === 'Pimpinan') {
    // Pimpinan goes to main executive dashboard
    return null // or let it render main dashboard
  } else if (role === 'Manager') {
    redirect('/dashboard/manager')
  } else if (role === 'Staff') {
    redirect('/dashboard/staff')
  }

  return null
}
