'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js'
import { FiPackage, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

// Dynamic import for Chart component
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
})

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
)

interface Medicine {
  id: string
  name: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  status: {
    status: 'safe' | 'warning' | 'danger'
    message: string
    color: string
  }
}

interface PredictionData {
  medicineName: string
  predictions: {
    label: string
    linearRegression: number
    movingAverage: number
  }[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [selectedMedicine, setSelectedMedicine] = useState<string>('all')

  // Use SWR for data fetching with caching
  const { data: medData, isLoading: medLoading, mutate: mutateMedicines } = useSWR<{ medicines: Medicine[] }>('/api/medicines')
  const { data: predData, isLoading: predLoading, mutate: mutatePredictions } = useSWR<{ predictions: PredictionData[] }>('/api/predictions/summary')

  const medicines: Medicine[] = medData?.medicines || []
  const predictions: PredictionData[] = predData?.predictions || []
  const loading = medLoading || predLoading

  const handleRefresh = async () => {
    toast.loading('Memperbarui data...')
    await Promise.all([mutateMedicines(), mutatePredictions()])
    toast.dismiss()
    toast.success('Data berhasil diperbarui')
  }

  const safeCount = medicines.filter(m => m.status.status === 'safe').length
  const warningCount = medicines.filter(m => m.status.status === 'warning').length
  const dangerCount = medicines.filter(m => m.status.status === 'danger').length

  // Chart data for selected medicine or overall
  const getChartData = () => {
    if (predictions.length === 0) {
      return {
        labels: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
        datasets: [
          {
            label: 'Linear Regression',
            data: [0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Moving Average',
            data: [0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgb(139, 92, 246)',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    }

    const filteredPredictions = selectedMedicine === 'all'
      ? predictions
      : predictions.filter(p => p.medicineName === selectedMedicine)

    if (filteredPredictions.length === 0 || !filteredPredictions[0]?.predictions) {
      return {
        labels: [],
        datasets: []
      }
    }

    const labels = filteredPredictions[0].predictions.map(p => p.label)
    
    // If showing all medicines, aggregate the data
    if (selectedMedicine === 'all' && filteredPredictions.length > 1) {
      const aggregatedLR = labels.map((_, idx) => 
        filteredPredictions.reduce((sum, pred) => sum + (pred.predictions[idx]?.linearRegression || 0), 0)
      )
      const aggregatedMA = labels.map((_, idx) =>
        filteredPredictions.reduce((sum, pred) => sum + (pred.predictions[idx]?.movingAverage || 0), 0)
      )

      return {
        labels,
        datasets: [
          {
            label: 'Linear Regression (Total)',
            data: aggregatedLR,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Moving Average (Total)',
            data: aggregatedMA,
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgb(139, 92, 246)',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    }

    const pred = filteredPredictions[0]
    return {
      labels,
      datasets: [
        {
          label: 'Linear Regression',
          data: pred.predictions.map(p => p.linearRegression),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Moving Average',
          data: pred.predictions.map(p => p.movingAverage),
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 1,
          borderRadius: 6,
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
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
      title: {
        display: true,
        text: selectedMedicine === 'all' 
          ? 'Prediksi Kebutuhan Obat 2 Tahun Kedepan (Semua Obat)' 
          : `Prediksi Kebutuhan: ${selectedMedicine}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mt-2 animate-shimmer"></div>
          </div>
        </div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-shimmer"></div>
                <div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="h-6 w-12 bg-gray-200 rounded mt-2 animate-shimmer"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="h-6 w-48 bg-gray-200 rounded animate-shimmer mb-6"></div>
          <div className="h-[300px] bg-gray-100 rounded-xl animate-shimmer"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Selamat datang, {(session?.user as any)?.name || 'User'}!
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Total Medicines */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Obat</p>
              <p className="text-2xl font-bold text-gray-800">{medicines.length}</p>
            </div>
          </div>
        </div>

        {/* Safe Stock */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stok Aman</p>
              <p className="text-2xl font-bold text-green-600">{safeCount}</p>
            </div>
          </div>
        </div>

        {/* Warning Stock */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <FiAlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perlu Dicek</p>
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
            </div>
          </div>
        </div>

        {/* Danger Stock */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FiAlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Harus Ditambah</p>
              <p className="text-2xl font-bold text-red-600">{dangerCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Grafik Prediksi</h2>
              <p className="text-sm text-gray-500">Prediksi kebutuhan stok per kuartal</p>
            </div>
          </div>
          <select
            value={selectedMedicine}
            onChange={(e) => setSelectedMedicine(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[200px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          >
            <option value="all">Semua Obat</option>
            {predictions.map(pred => (
              <option key={pred.medicineName} value={pred.medicineName}>
                {pred.medicineName}
              </option>
            ))}
          </select>
        </div>
        <div className="h-[400px]">
          <Bar data={getChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Medicine List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Daftar Obat</h2>
          {medicines.length > 10 && (
            <span className="text-sm text-gray-500">Menampilkan 10 dari {medicines.length} obat</span>
          )}
        </div>
        {medicines.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada data obat</p>
            <p className="text-sm text-gray-400 mt-1">Import data untuk memulai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nama Obat</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Stok Saat Ini</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Min Stok</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Max Stok</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Satuan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.slice(0, 10).map((medicine) => (
                  <tr key={medicine.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">{medicine.name}</td>
                    <td className="py-3 px-4 text-gray-600">{medicine.currentStock}</td>
                    <td className="py-3 px-4 text-gray-600">{medicine.minStock}</td>
                    <td className="py-3 px-4 text-gray-600">{medicine.maxStock}</td>
                    <td className="py-3 px-4 text-gray-600">{medicine.unit}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          medicine.status.status === 'safe'
                            ? 'bg-green-100 text-green-700'
                            : medicine.status.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {medicine.status.message}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
