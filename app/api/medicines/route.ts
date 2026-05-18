import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getStockStatus } from '@/lib/prediction'

function getQuarterIndex(year: number, quarter: number): number {
  return year * 10 + quarter
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const medicines = await prisma.medicine.findMany({
      where: { userId },
      include: {
        predictions: {
          orderBy: [{ year: 'asc' }, { quarter: 'asc' }]
        }
      },
      orderBy: { name: 'asc' }
    })

    const medicinesWithStatus = medicines.map(med => {
      let stockForStatus = med.currentStock

      const lrPred = med.predictions.find(p => p.method === 'linear_regression')
      if (lrPred) {
        const targetQuarter = getQuarterIndex(lrPred.year, lrPred.quarter)
        const pairedMa = med.predictions.find(
          p =>
            p.method === 'moving_average' &&
            getQuarterIndex(p.year, p.quarter) === targetQuarter
        )

        const predictedNeed = Math.round(
          (lrPred.predictedValue + (pairedMa?.predictedValue ?? lrPred.predictedValue)) / 2
        )
        stockForStatus = med.currentStock - predictedNeed
      }

      return {
        ...med,
        status: getStockStatus(stockForStatus, med.minStock, med.maxStock)
      }
    })

    const response = NextResponse.json({ medicines: medicinesWithStatus })
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30')
    return response
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
