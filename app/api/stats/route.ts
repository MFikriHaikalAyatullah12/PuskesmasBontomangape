import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const [medicines, stockHistories, predictions] = await Promise.all([
      prisma.medicine.count({ where: { userId } }),
      prisma.stockHistory.count({ where: { userId } }),
      prisma.prediction.count({ where: { userId } })
    ])

    return NextResponse.json({
      medicines,
      stockHistories,
      predictions
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
