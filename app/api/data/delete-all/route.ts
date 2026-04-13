import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Delete in correct order due to foreign keys
    // 1. Delete predictions
    await prisma.prediction.deleteMany({
      where: { userId }
    })

    // 2. Delete stock histories
    await prisma.stockHistory.deleteMany({
      where: { userId }
    })

    // 3. Delete medicines
    await prisma.medicine.deleteMany({
      where: { userId }
    })

    return NextResponse.json({
      message: 'Semua data berhasil dihapus'
    })
  } catch (error) {
    console.error('Error deleting data:', error)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}
