import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  predictLinearRegression,
  predictMovingAverage,
  aggregateToQuarterly,
  generateFutureQuarters
} from '@/lib/prediction'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Get all medicines with their predictions and stock histories
    const medicines = await prisma.medicine.findMany({
      where: { userId },
      include: {
        predictions: {
          orderBy: [{ year: 'asc' }, { quarter: 'asc' }]
        },
        stockHistories: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }]
        }
      }
    })

    const predictions = medicines
      .filter(m => m.stockHistories.length > 0)
      .map(medicine => {
        // If predictions exist, use them
        if (medicine.predictions.length > 0) {
          const lrPredictions = medicine.predictions.filter(p => p.method === 'linear_regression')
          const maPredictions = medicine.predictions.filter(p => p.method === 'moving_average')

          const combinedPredictions = lrPredictions.map(lr => {
            const ma = maPredictions.find(m => m.quarter === lr.quarter && m.year === lr.year)
            return {
              label: `Q${lr.quarter} ${lr.year}`,
              linearRegression: Math.round(lr.predictedValue),
              movingAverage: Math.round(ma?.predictedValue || lr.predictedValue)
            }
          })

          return {
            medicineName: medicine.name,
            predictions: combinedPredictions
          }
        }

        // Generate predictions on-the-fly if not saved
        const monthlyData = medicine.stockHistories.map(h => ({
          month: h.month,
          year: h.year,
          value: h.quantity
        }))

        const quarterlyData = aggregateToQuarterly(monthlyData)
        
        if (quarterlyData.length < 1) {
          return {
            medicineName: medicine.name,
            predictions: []
          }
        }

        const dataPoints = quarterlyData.map((q, idx) => ({ x: idx, y: q.value }))
        const lastQuarter = quarterlyData[quarterlyData.length - 1]
        const futureQuarters = generateFutureQuarters(lastQuarter.year, lastQuarter.quarter, 8)
        
        const futureX = futureQuarters.map((_, idx) => dataPoints.length + idx)
        
        // Linear Regression (OLS): ŷ = mx + b
        const lrResult = predictLinearRegression(dataPoints, futureX)
        
        // Moving Average (Holt's Linear Trend): Fₜ₊ₖ = Lₜ + k × Tₜ
        const values = quarterlyData.map(q => q.value)
        const maResult = predictMovingAverage(values, 8, 3)

        const combinedPredictions = futureQuarters.map((fq, i) => ({
          label: fq.label,
          linearRegression: lrResult.predictions[i],
          movingAverage: maResult.predictions[i]
        }))

        return {
          medicineName: medicine.name,
          predictions: combinedPredictions
        }
      })

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Error fetching prediction summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
