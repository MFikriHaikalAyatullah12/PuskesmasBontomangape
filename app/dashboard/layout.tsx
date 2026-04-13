import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import { getStockStatus } from '@/lib/prediction'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const userId = (session.user as any).id

  // Get notification counts
  const medicines = await prisma.medicine.findMany({
    where: { userId }
  })

  let safe = 0
  let warning = 0
  let danger = 0

  for (const med of medicines) {
    const status = getStockStatus(med.currentStock, med.minStock, med.maxStock)
    if (status.status === 'safe') safe++
    else if (status.status === 'warning') warning++
    else danger++
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar notifications={{ safe, warning, danger }} />
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
