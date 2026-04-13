// Prediction utilities using Linear Regression and Moving Average
// Implementasi menggunakan rumus matematika yang BENAR dan ASLI

interface DataPoint {
  x: number
  y: number
}

// ============================================
// LINEAR REGRESSION (Ordinary Least Squares - OLS)
// ============================================
// Rumus Asli:
// slope (m) = (n × Σxy - Σx × Σy) / (n × Σx² - (Σx)²)
// intercept (b) = (Σy - m × Σx) / n
// Prediksi: ŷ = m × x + b
// R² = 1 - (SS_res / SS_tot)
// ============================================

export function linearRegression(data: DataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = data.length
  
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0 }
  }
  
  if (n === 1) {
    // Dengan 1 titik data, tidak bisa menghitung slope
    // Return nilai konstan (tidak ada tren)
    return { slope: 0, intercept: data[0].y, r2: 0 }
  }

  // Hitung komponen rumus
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0

  for (const point of data) {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumX2 += point.x * point.x
    sumY2 += point.y * point.y
  }

  // Rumus OLS untuk slope dan intercept
  const denominator = n * sumX2 - sumX * sumX
  
  if (denominator === 0) {
    // Semua nilai x sama, tidak bisa menghitung slope
    return { slope: 0, intercept: sumY / n, r2: 0 }
  }

  // slope (m) = (n × Σxy - Σx × Σy) / (n × Σx² - (Σx)²)
  const slope = (n * sumXY - sumX * sumY) / denominator
  
  // intercept (b) = (Σy - m × Σx) / n  
  // Atau bisa ditulis: b = ȳ - m × x̄
  const intercept = (sumY - slope * sumX) / n

  // Hitung R-squared (koefisien determinasi)
  // R² = 1 - (SS_res / SS_tot)
  // SS_tot = Σ(yᵢ - ȳ)² = total sum of squares
  // SS_res = Σ(yᵢ - ŷᵢ)² = residual sum of squares
  const yMean = sumY / n
  let ssTot = 0
  let ssRes = 0

  for (const point of data) {
    const predicted = slope * point.x + intercept
    ssTot += Math.pow(point.y - yMean, 2)
    ssRes += Math.pow(point.y - predicted, 2)
  }

  // R² menunjukkan seberapa baik model menjelaskan variasi data
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot))

  return { slope, intercept, r2 }
}

export function predictLinearRegression(
  data: DataPoint[],
  futureX: number[]
): { predictions: number[]; confidence: number; slope: number; intercept: number } {
  // Jika hanya 1 data point, gunakan estimasi pertumbuhan linear 5% per periode
  if (data.length === 1) {
    const baseValue = data[0].y
    const estimatedGrowthRate = 0.05 // 5% per kuartal untuk Linear Regression
    const predictions = futureX.map((_, i) => {
      // Prediksi: nilai_awal × (1 + growth)^periode
      const predicted = baseValue * Math.pow(1 + estimatedGrowthRate, i + 1)
      return Math.max(0, Math.round(predicted))
    })
    return { 
      predictions, 
      confidence: 0.3, // Low confidence karena data terbatas
      slope: baseValue * estimatedGrowthRate, 
      intercept: baseValue 
    }
  }

  const { slope, intercept, r2 } = linearRegression(data)
  
  // Prediksi menggunakan rumus: ŷ = m × x + b
  const predictions = futureX.map(x => {
    const predicted = slope * x + intercept
    return Math.max(0, Math.round(predicted))
  })

  return { predictions, confidence: r2, slope, intercept }
}

// ============================================
// SIMPLE MOVING AVERAGE (SMA) dengan HOLT'S LINEAR TREND
// ============================================
// Rumus SMA Asli: SMA = (X₁ + X₂ + ... + Xₙ) / n
// 
// Untuk prediksi masa depan, gunakan HOLT'S METHOD (Double Exponential Smoothing):
// Level: Lₜ = α × Yₜ + (1-α) × (Lₜ₋₁ + Tₜ₋₁)
// Trend: Tₜ = β × (Lₜ - Lₜ₋₁) + (1-β) × Tₜ₋₁
// Forecast: Fₜ₊ₖ = Lₜ + k × Tₜ
// ============================================

export function simpleMovingAverage(data: number[], period: number): number[] {
  // SMA = (X₁ + X₂ + ... + Xₙ) / n
  if (data.length === 0) return []
  
  const result: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Belum cukup data untuk periode penuh, hitung rata-rata yang tersedia
      const slice = data.slice(0, i + 1)
      result.push(slice.reduce((a, b) => a + b, 0) / slice.length)
    } else {
      // SMA dengan periode penuh
      const slice = data.slice(i - period + 1, i + 1)
      result.push(slice.reduce((a, b) => a + b, 0) / period)
    }
  }

  return result.map(v => Math.round(v))
}

export function predictMovingAverage(
  data: number[],
  periods: number,
  windowSize: number = 3
): { predictions: number[]; trend: 'up' | 'down' | 'stable'; level: number; trendValue: number } {
  if (data.length === 0) {
    return { predictions: Array(periods).fill(0), trend: 'stable', level: 0, trendValue: 0 }
  }

  if (data.length === 1) {
    // Hanya 1 data: gunakan estimasi pertumbuhan konservatif 2% per periode
    // Moving Average lebih konservatif dari Linear Regression
    const baseValue = data[0]
    const estimatedGrowthRate = 0.02 // 2% per kuartal untuk Moving Average
    const predictions: number[] = []
    
    for (let k = 1; k <= periods; k++) {
      // Prediksi dengan dampening effect (pertumbuhan berkurang seiring waktu)
      const dampeningFactor = Math.pow(0.95, k - 1) // efek berkurang 5% setiap periode
      const effectiveGrowth = estimatedGrowthRate * dampeningFactor
      const predicted = baseValue * Math.pow(1 + effectiveGrowth, k)
      predictions.push(Math.max(0, Math.round(predicted)))
    }
    
    return { 
      predictions, 
      trend: 'stable', 
      level: baseValue, 
      trendValue: baseValue * estimatedGrowthRate 
    }
  }

  // ========================================
  // HOLT'S LINEAR TREND METHOD
  // (Double Exponential Smoothing)
  // ========================================
  
  // Parameter smoothing (bisa disesuaikan, 0 < α,β < 1)
  const alpha = 0.3  // Level smoothing factor
  const beta = 0.1   // Trend smoothing factor

  // Inisialisasi
  // L₀ = Y₀ (level awal = nilai pertama)
  // T₀ = Y₁ - Y₀ (trend awal = selisih 2 nilai pertama)
  let level = data[0]
  let trendValue = data[1] - data[0]

  // Iterasi untuk setiap data point
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level
    
    // Update Level: Lₜ = α × Yₜ + (1-α) × (Lₜ₋₁ + Tₜ₋₁)
    level = alpha * data[i] + (1 - alpha) * (prevLevel + trendValue)
    
    // Update Trend: Tₜ = β × (Lₜ - Lₜ₋₁) + (1-β) × Tₜ₋₁
    trendValue = beta * (level - prevLevel) + (1 - beta) * trendValue
  }

  // Generate prediksi: Fₜ₊ₖ = Lₜ + k × Tₜ
  const predictions: number[] = []
  for (let k = 1; k <= periods; k++) {
    const forecast = level + k * trendValue
    predictions.push(Math.max(0, Math.round(forecast)))
  }

  // Tentukan tren berdasarkan nilai trend
  let trend: 'up' | 'down' | 'stable' = 'stable'
  const avgValue = data.reduce((a, b) => a + b, 0) / data.length
  const trendPercentage = (trendValue / avgValue) * 100

  if (trendPercentage > 1) {
    trend = 'up'
  } else if (trendPercentage < -1) {
    trend = 'down'
  }

  return { predictions, trend, level: Math.round(level), trendValue: Math.round(trendValue * 100) / 100 }
}

// Convert monthly/yearly data to quarterly
// Jika data adalah tahunan (semua month = 6), spread ke 4 kuartal
export function aggregateToQuarterly(monthlyData: { month: number; year: number; value: number }[]): {
  quarter: number
  year: number
  value: number
}[] {
  if (monthlyData.length === 0) return []

  // Deteksi apakah data adalah tahunan (semua month sama, biasanya 6)
  const uniqueMonths = new Set(monthlyData.map(d => d.month))
  const isYearlyData = uniqueMonths.size === 1 && monthlyData.length > 1
  
  const quarterlyMap = new Map<string, { quarter: number; year: number; values: number[] }>()

  if (isYearlyData) {
    // Data tahunan: spread nilai ke 4 kuartal per tahun
    // Dengan variasi kecil untuk mensimulasikan fluktuasi
    for (const item of monthlyData) {
      const yearlyValue = item.value
      const quarterlyValue = yearlyValue / 4
      
      // Spread ke 4 kuartal dengan sedikit variasi
      const variations = [0.95, 1.0, 1.05, 1.0] // Q1 rendah, Q2 normal, Q3 tinggi, Q4 normal
      
      for (let q = 1; q <= 4; q++) {
        const key = `${item.year}-Q${q}`
        const value = Math.round(quarterlyValue * variations[q - 1])
        
        if (!quarterlyMap.has(key)) {
          quarterlyMap.set(key, { quarter: q, year: item.year, values: [] })
        }
        quarterlyMap.get(key)!.values.push(value)
      }
    }
  } else {
    // Data bulanan: agregasi seperti biasa
    for (const item of monthlyData) {
      const quarter = Math.ceil(item.month / 3)
      const key = `${item.year}-Q${quarter}`
      
      if (!quarterlyMap.has(key)) {
        quarterlyMap.set(key, { quarter, year: item.year, values: [] })
      }
      quarterlyMap.get(key)!.values.push(item.value)
    }
  }

  return Array.from(quarterlyMap.values())
    .map(item => ({
      quarter: item.quarter,
      year: item.year,
      value: Math.round(item.values.reduce((a, b) => a + b, 0) / item.values.length)
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.quarter - b.quarter
    })
}

// Generate future quarters
export function generateFutureQuarters(startYear: number, startQuarter: number, count: number): {
  quarter: number
  year: number
  label: string
}[] {
  const quarters: { quarter: number; year: number; label: string }[] = []
  let year = startYear
  let quarter = startQuarter

  for (let i = 0; i < count; i++) {
    quarter++
    if (quarter > 4) {
      quarter = 1
      year++
    }
    quarters.push({
      quarter,
      year,
      label: `Q${quarter} ${year}`
    })
  }

  return quarters
}

// Determine stock status
export function getStockStatus(current: number, min: number, max: number): {
  status: 'safe' | 'warning' | 'danger'
  message: string
  color: string
} {
  if (current <= min) {
    return {
      status: 'danger',
      message: 'Harus Ditambah',
      color: 'red'
    }
  } else if (current <= min * 2) {
    return {
      status: 'warning', 
      message: 'Perlu Dicek Ulang',
      color: 'yellow'
    }
  } else {
    return {
      status: 'safe',
      message: 'Stok Aman',
      color: 'green'
    }
  }
}
