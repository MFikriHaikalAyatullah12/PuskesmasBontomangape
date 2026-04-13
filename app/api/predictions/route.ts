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

    // Get all medicines with their stock histories and predictions
    const medicines = await prisma.medicine.findMany({
      where: { userId },
      include: {
        stockHistories: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }]
        },
        predictions: {
          orderBy: [{ year: 'asc' }, { quarter: 'asc' }]
        }
      }
    })

    const predictions = medicines
      .filter(m => m.stockHistories.length > 0)
      .map(medicine => {
        // Convert histories to quarterly data
        const monthlyData = medicine.stockHistories.map(h => ({
          month: h.month,
          year: h.year,
          value: h.quantity
        }))

        const quarterlyData = aggregateToQuarterly(monthlyData)

        // Get historical data for chart
        const historicalData = quarterlyData.map(q => ({
          quarter: `Q${q.quarter} ${q.year}`,
          value: q.value
        }))

        // Calculate trend from historical data
        const values = quarterlyData.map(q => q.value)
        const { trend } = predictMovingAverage(values, 0)

        // Check if we have saved predictions
        let savedPredictions: any[] = []
        let accuracy = 0.75

        if (medicine.predictions.length > 0) {
          // Use saved predictions
          savedPredictions = medicine.predictions
            .filter(p => p.method === 'linear_regression')
            .map(p => {
              const maPred = medicine.predictions.find(
                mp => mp.method === 'moving_average' && mp.quarter === p.quarter && mp.year === p.year
              )
              return {
                label: `Q${p.quarter} ${p.year}`,
                quarter: p.quarter,
                year: p.year,
                linearRegression: Math.round(p.predictedValue),
                movingAverage: Math.round(maPred?.predictedValue || p.predictedValue)
              }
            })
          
          const lrPrediction = medicine.predictions.find(p => p.method === 'linear_regression')
          accuracy = lrPrediction?.confidence || 0.75
        } else if (quarterlyData.length >= 1) {
          // Generate predictions on-the-fly menggunakan rumus asli
          const dataPoints = quarterlyData.map((q, idx) => ({ x: idx, y: q.value }))
          const lastQuarter = quarterlyData[quarterlyData.length - 1]
          const futureQuarters = generateFutureQuarters(lastQuarter.year, lastQuarter.quarter, 8)
          
          const futureX = futureQuarters.map((_, idx) => dataPoints.length + idx)
          
          // Linear Regression (OLS) - rumus: ŷ = mx + b
          const lrResult = predictLinearRegression(dataPoints, futureX)
          
          // Moving Average (Holt's Linear Trend) - rumus: Fₜ₊ₖ = Lₜ + k × Tₜ
          const maResult = predictMovingAverage(values, 8, 3)

          savedPredictions = futureQuarters.map((fq, i) => ({
            label: fq.label,
            quarter: fq.quarter,
            year: fq.year,
            linearRegression: lrResult.predictions[i],
            movingAverage: maResult.predictions[i]
          }))

          accuracy = lrResult.confidence
        }

        return {
          medicineId: medicine.id,
          medicineName: medicine.name,
          currentStock: medicine.currentStock,
          historicalData,
          predictions: savedPredictions,
          linearRegressionAccuracy: accuracy,
          movingAveragetrend: trend
        }
      })

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Error fetching predictions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
