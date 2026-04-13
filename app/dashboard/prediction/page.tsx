'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import {
  FiCpu,
  FiTrendingUp,
  FiRefreshCw,
  FiLoader,
  FiInfo,
  FiBarChart2,
  FiActivity,
  FiDownload
} from 'react-icons/fi'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface PredictionResult {
  medicineName: string
  medicineId: string
  currentStock: number
  historicalData: { quarter: string; value: number }[]
  predictions: {
    label: string
    quarter: number
    year: number
    linearRegression: number
    movingAverage: number
  }[]
  linearRegressionAccuracy: number
  movingAveragetrend: 'up' | 'down' | 'stable'
}

export default function PredictionPage() {
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<string>('')

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions')
      if (res.ok) {
        const data = await res.json()
        setPredictions(data.predictions || [])
        if (data.predictions?.length > 0 && !selectedMedicine) {
          setSelectedMedicine(data.predictions[0].medicineId)
        }
      }
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMedicine])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions])

  const handleGeneratePredictions = async () => {
    try {
      setGenerating(true)
      const res = await fetch('/api/predictions/generate', {
        method: 'POST'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal generate prediksi')
      }

      toast.success(`Berhasil generate prediksi untuk ${data.count} obat`)
      fetchPredictions()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerating(false)
    }
  }

  // Download Excel function
  const handleDownloadExcel = () => {
    if (predictions.length === 0) {
      toast.error('Tidak ada data prediksi untuk didownload')
      return
    }

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Summary semua obat
    const summaryData = predictions.map(pred => {
      const avgLR = pred.predictions.length > 0 
        ? Math.round(pred.predictions.reduce((a, b) => a + b.linearRegression, 0) / pred.predictions.length)
        : 0
      const avgMA = pred.predictions.length > 0 
        ? Math.round(pred.predictions.reduce((a, b) => a + b.movingAverage, 0) / pred.predictions.length)
        : 0
      
      return {
        'Nama Obat': pred.medicineName,
        'Stok Saat Ini': pred.currentStock,
        'Rata-rata Prediksi LR': avgLR,
        'Rata-rata Prediksi MA': avgMA,
        'Akurasi LR (%)': (pred.linearRegressionAccuracy * 100).toFixed(1),
        'Tren MA': pred.movingAveragetrend === 'up' ? 'Naik' : pred.movingAveragetrend === 'down' ? 'Turun' : 'Stabil'
      }
    })
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan')

    // Sheet 2: Detail prediksi semua obat
    const detailData: any[] = []
    predictions.forEach(pred => {
      // Historical data
      pred.historicalData.forEach(h => {
        detailData.push({
          'Nama Obat': pred.medicineName,
          'Periode': h.quarter,
          'Tipe': 'Data Historis',
          'Nilai': h.value,
          'Linear Regression': '-',
          'Moving Average': '-'
        })
      })
      
      // Predictions
      pred.predictions.forEach(p => {
        detailData.push({
          'Nama Obat': pred.medicineName,
          'Periode': p.label,
          'Tipe': 'Prediksi',
          'Nilai': '-',
          'Linear Regression': p.linearRegression,
          'Moving Average': p.movingAverage
        })
      })
    })
    
    const wsDetail = XLSX.utils.json_to_sheet(detailData)
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Prediksi')

    // Sheet per obat - SEMUA OBAT dengan data historis + prediksi 2 tahun kedepan
    predictions.forEach((pred, index) => {
      const obatData: any[] = []
      
      // Data Historis
      pred.historicalData.forEach(h => {
        obatData.push({
          'Periode': h.quarter,
          'Tipe Data': 'Historis',
          'Kuartal': h.quarter.split(' ')[0],
          'Tahun': h.quarter.split(' ')[1],
          'Linear Regression': h.value,
          'Moving Average': h.value,
          'Selisih': 0
        })
      })
      
      // Prediksi 2 Tahun Kedepan (8 kuartal)
      pred.predictions.forEach(p => {
        obatData.push({
          'Periode': p.label,
          'Tipe Data': 'Prediksi',
          'Kuartal': `Q${p.quarter}`,
          'Tahun': p.year,
          'Linear Regression': p.linearRegression,
          'Moving Average': p.movingAverage,
          'Selisih': p.linearRegression - p.movingAverage
        })
      })
      
      if (obatData.length > 0) {
        const wsObat = XLSX.utils.json_to_sheet(obatData)
        // Sheet name max 31 chars, replace invalid chars
        const sheetName = pred.medicineName
          .replace(/[\\/*?:[\]]/g, '')
          .slice(0, 31) || `Obat_${index + 1}`
        XLSX.utils.book_append_sheet(wb, wsObat, sheetName)
      }
    })

    // Download
    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Prediksi_Obat_Puskesmas_${today}.xlsx`)
    toast.success('File Excel berhasil didownload!')
  }

  const selectedPrediction = predictions.find(p => p.medicineId === selectedMedicine)

  const getChartData = () => {
    if (!selectedPrediction) {
      return {
        labels: [],
        datasets: []
      }
    }

    const historicalLabels = selectedPrediction.historicalData.map(h => h.quarter)
    const predictionLabels = selectedPrediction.predictions.map(p => p.label)
    const allLabels = [...historicalLabels, ...predictionLabels]

    const historicalValues = selectedPrediction.historicalData.map(h => h.value)
    const lrPredictions = selectedPrediction.predictions.map(p => p.linearRegression)
    const maPredictions = selectedPrediction.predictions.map(p => p.movingAverage)

    return {
      labels: allLabels,
      datasets: [
        {
          label: 'Data Historis',
          data: [...historicalValues, ...Array(predictionLabels.length).fill(null)],
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Prediksi Linear Regression',
          data: [...Array(historicalLabels.length).fill(null), ...lrPredictions],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Prediksi Moving Average',
          data: [...Array(historicalLabels.length).fill(null), ...maPredictions],
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    }
  }

  const getLineChartData = () => {
    if (!selectedPrediction) {
      return { labels: [], datasets: [] }
    }

    const historicalLabels = selectedPrediction.historicalData.map(h => h.quarter)
    const predictionLabels = selectedPrediction.predictions.map(p => p.label)
    const allLabels = [...historicalLabels, ...predictionLabels]

    const historicalValues = selectedPrediction.historicalData.map(h => h.value)
    const lrPredictions = selectedPrediction.predictions.map(p => p.linearRegression)
    const maPredictions = selectedPrediction.predictions.map(p => p.movingAverage)

    return {
      labels: allLabels,
      datasets: [
        {
          label: 'Data Historis',
          data: [...historicalValues, ...Array(predictionLabels.length).fill(null)],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Linear Regression',
          data: [...Array(historicalLabels.length - 1).fill(null), historicalValues[historicalValues.length - 1], ...lrPredictions],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          borderDash: [5, 5],
          pointRadius: 5,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Moving Average',
          data: [...Array(historicalLabels.length - 1).fill(null), historicalValues[historicalValues.length - 1], ...maPredictions],
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          borderDash: [10, 5],
          pointRadius: 5,
          pointBackgroundColor: 'rgb(139, 92, 246)',
          tension: 0.3,
          fill: true,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
          <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-shimmer"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-shimmer h-24"></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="h-[350px] bg-gray-100 rounded-xl animate-shimmer"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Prediksi AI</h1>
          <p className="text-gray-500 mt-1">
            Prediksi kebutuhan stok obat menggunakan Machine Learning
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadExcel}
            disabled={predictions.length === 0}
            className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="w-5 h-5" />
            <span>Download Excel</span>
          </button>
          <button
            onClick={handleGeneratePredictions}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <FiLoader className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FiCpu className="w-5 h-5" />
                <span>Generate Prediksi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Method Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">Linear Regression</h3>
              <p className="text-sm text-blue-600 mt-1">
                Metode statistik yang memprediksi nilai berdasarkan hubungan linear antara variabel.
                Cocok untuk data dengan tren yang konsisten.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiActivity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-800">Moving Average</h3>
              <p className="text-sm text-purple-600 mt-1">
                Metode yang menghaluskan fluktuasi data dengan menghitung rata-rata bergerak.
                Bagus untuk mendeteksi tren jangka panjang.
              </p>
            </div>
          </div>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <FiCpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800">Belum Ada Prediksi</h3>
          <p className="text-gray-500 mt-2">
            Klik tombol "Generate Prediksi" untuk membuat prediksi kebutuhan obat
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Pastikan sudah import data history stok obat terlebih dahulu
          </p>
        </div>
      ) : (
        <>
          {/* Medicine Selector */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="font-medium text-gray-700">Pilih Obat:</label>
              <select
                value={selectedMedicine}
                onChange={(e) => setSelectedMedicine(e.target.value)}
                className="flex-1 max-w-md px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {predictions.map(pred => (
                  <option key={pred.medicineId} value={pred.medicineId}>
                    {pred.medicineName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPrediction && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Stok Saat Ini</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {selectedPrediction.currentStock}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Akurasi Linear Regression</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {(selectedPrediction.linearRegressionAccuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Tren Moving Average</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    selectedPrediction.movingAveragetrend === 'up' 
                      ? 'text-green-600' 
                      : selectedPrediction.movingAveragetrend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {selectedPrediction.movingAveragetrend === 'up' 
                      ? '↑ Naik' 
                      : selectedPrediction.movingAveragetrend === 'down'
                      ? '↓ Turun'
                      : '→ Stabil'}
                  </p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <FiBarChart2 className="w-6 h-6 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Grafik Batang - Prediksi 2 Tahun Kedepan
                  </h2>
                </div>
                <div className="h-[400px]">
                  <Bar data={getChartData()} options={chartOptions} />
                </div>
              </div>

              {/* Line Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <FiTrendingUp className="w-6 h-6 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Grafik Garis - Tren & Prediksi
                  </h2>
                </div>
                <div className="h-[400px]">
                  <Line data={getLineChartData()} options={chartOptions} />
                </div>
              </div>

              {/* Prediction Table */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Detail Prediksi per Kuartal
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Periode</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Linear Regression</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Moving Average</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPrediction.predictions.map((pred, idx) => {
                        const diff = pred.linearRegression - pred.movingAverage
                        return (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-800">{pred.label}</td>
                            <td className="py-3 px-4 text-blue-600 font-semibold">{pred.linearRegression}</td>
                            <td className="py-3 px-4 text-purple-600 font-semibold">{pred.movingAverage}</td>
                            <td className={`py-3 px-4 font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
