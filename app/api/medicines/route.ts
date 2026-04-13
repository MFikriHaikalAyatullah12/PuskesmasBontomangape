import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getStockStatus } from '@/lib/prediction'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const medicines = await prisma.medicine.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    })

    const medicinesWithStatus = medicines.map(med => ({
      ...med,
      status: getStockStatus(med.currentStock, med.minStock, med.maxStock)
    }))

    return NextResponse.json({ medicines: medicinesWithStatus })
  } catch (error) {
    console.error('Error fetching medicines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    const { name, unit, currentStock, minStock, maxStock } = body

    if (!name) {
      return NextResponse.json({ error: 'Nama obat harus diisi' }, { status: 400 })
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        unit: unit || 'tablet',
        currentStock: currentStock || 0,
        minStock: minStock || 10,
        maxStock: maxStock || 100,
        userId
      }
    })

    return NextResponse.json({ medicine })
  } catch (error: any) {
    console.error('Error creating medicine:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Obat dengan nama ini sudah ada' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
