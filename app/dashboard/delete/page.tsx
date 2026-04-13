'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  FiTrash2,
  FiAlertTriangle,
  FiLoader,
  FiCheckCircle,
  FiDatabase,
  FiPackage,
  FiTrendingUp
} from 'react-icons/fi'

export default function DeletePage() {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [stats, setStats] = useState<{
    medicines: number
    stockHistories: number
    predictions: number
  } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleShowConfirm = async () => {
    await fetchStats()
    setShowConfirm(true)
  }

  const handleDelete = async () => {
    if (confirmText !== 'HAPUS SEMUA DATA') {
      toast.error('Ketik "HAPUS SEMUA DATA" untuk konfirmasi')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/data/delete-all', {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus data')
      }

      toast.success('Semua data berhasil dihapus')
      setShowConfirm(false)
      setConfirmText('')
      setStats(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setConfirmText('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Hapus Data</h1>
        <p className="text-gray-500 mt-1">
          Hapus semua data obat dan history pada akun Anda
        </p>
      </div>

      {/* Warning */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800 text-lg">Peringatan!</h3>
            <p className="text-red-600 mt-2">
              Menghapus data bersifat permanen dan tidak dapat dibatalkan. Semua data berikut akan dihapus:
            </p>
            <ul className="text-red-600 mt-3 space-y-1">
              <li>• Semua data obat</li>
              <li>• Semua history stok</li>
              <li>• Semua hasil prediksi</li>
            </ul>
            <p className="text-red-700 font-medium mt-4">
              Pastikan Anda sudah membackup data sebelum menghapus!
            </p>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      {!showConfirm ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiTrash2 className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Hapus Semua Data
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Klik tombol di bawah untuk menghapus semua data pada akun Anda.
            Data pada akun lain tidak akan terpengaruh.
          </p>
          <button
            onClick={handleShowConfirm}
            className="px-8 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
          >
            Hapus Semua Data
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-200">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <FiPackage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">{stats.medicines}</p>
                <p className="text-sm text-gray-500">Data Obat</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <FiDatabase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">{stats.stockHistories}</p>
                <p className="text-sm text-gray-500">History Stok</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <FiTrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-800">{stats.predictions}</p>
                <p className="text-sm text-gray-500">Prediksi</p>
              </div>
            </div>
          )}

          {/* Confirmation Input */}
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
              Konfirmasi Penghapusan
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Ketik <strong className="text-red-600">HAPUS SEMUA DATA</strong> untuk mengkonfirmasi
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik di sini..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'HAPUS SEMUA DATA'}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-5 h-5" />
                    <span>Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FiCheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Data Terisolasi</h3>
            <p className="text-sm text-blue-600 mt-1">
              Data Anda terisolasi dari pengguna lain. Menghapus data pada akun Anda
              tidak akan mempengaruhi data pada akun lain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
