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

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Get all medicines with their stock histories
    const medicines = await prisma.medicine.findMany({
      where: { userId },
      include: {
        stockHistories: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }]
        }
      }
    })

    if (medicines.length === 0) {
      return NextResponse.json({ 
        error: 'Tidak ada data obat. Import data terlebih dahulu.' 
      }, { status: 400 })
    }

    // Delete existing predictions for this user
    await prisma.prediction.deleteMany({
      where: { userId }
    })

    let generatedCount = 0
    const allPredictions: any[] = []

    for (const medicine of medicines) {
      // Allow even single data point
      if (medicine.stockHistories.length < 1) {
        continue
      }

      const monthlyData = medicine.stockHistories.map(h => ({
        month: h.month,
        year: h.year,
        value: h.quantity
      }))

      const quarterlyData = aggregateToQuarterly(monthlyData)

      if (quarterlyData.length < 1) {
        continue
      }

      const dataPoints = quarterlyData.map((q, idx) => ({
        x: idx,
        y: q.value
      }))

      const lastQuarter = quarterlyData[quarterlyData.length - 1]
      const futureQuarters = generateFutureQuarters(lastQuarter.year, lastQuarter.quarter, 8)

      const futureX = futureQuarters.map((_, idx) => dataPoints.length + idx)
      
      // Linear Regression (OLS): ŷ = mx + b
      const lrResult = predictLinearRegression(dataPoints, futureX)
      
      // Moving Average (Holt's Linear Trend): Fₜ₊ₖ = Lₜ + k × Tₜ
      const values = quarterlyData.map(q => q.value)
      const maResult = predictMovingAverage(values, 8, 3)

      // Prepare batch data
      for (let i = 0; i < futureQuarters.length; i++) {
        const fq = futureQuarters[i]
        
        allPredictions.push({
          medicineId: medicine.id,
          userId,
          method: 'linear_regression',
          quarter: fq.quarter,
          year: fq.year,
          predictedValue: lrResult.predictions[i],
          confidence: lrResult.confidence
        })

        allPredictions.push({
          medicineId: medicine.id,
          userId,
          method: 'moving_average',
          quarter: fq.quarter,
          year: fq.year,
          predictedValue: maResult.predictions[i],
          confidence: maResult.trend === 'stable' ? 0.8 : 0.6
        })
      }

      generatedCount++
    }

    // Batch insert all predictions at once
    if (allPredictions.length > 0) {
      await prisma.prediction.createMany({
        data: allPredictions
      })
    }

    return NextResponse.json({
      count: generatedCount,
      message: `Berhasil generate prediksi untuk ${generatedCount} obat`
    })
  } catch (error) {
    console.error('Error generating predictions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
