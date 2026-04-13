'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  FiUploadCloud,
  FiFile,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiLoader,
  FiFileText,
  FiInfo
} from 'react-icons/fi'

interface ParsedData {
  name: string
  quantity: number
  date: string
  month: number
  year: number
  unit?: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  preview: ParsedData[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<ParsedData[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith('.xlsx') && 
        !selectedFile.name.endsWith('.xls') &&
        !selectedFile.name.endsWith('.csv')) {
      toast.error('Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV')
      return
    }

    setFile(selectedFile)
    setResult(null)
    
    // Preview the data
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')

      const res = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membaca file')
      }

      setPreviewData(data.data || [])
      
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((err: string) => toast.error(err))
      }

      if (data.data?.length > 0) {
        toast.success(`Berhasil membaca ${data.data.length} baris data`)
      }
    } catch (error: any) {
      toast.error(error.message)
      setFile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const handleImport = async () => {
    if (!file) return

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengimport data')
      }

      setResult({
        success: true,
        imported: data.imported || 0,
        errors: data.errors || [],
        preview: []
      })

      toast.success(`Berhasil mengimport ${data.imported} data obat`)
      setFile(null)
      setPreviewData([])
    } catch (error: any) {
      toast.error(error.message)
      setResult({
        success: false,
        imported: 0,
        errors: [error.message],
        preview: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setResult(null)
    setPreviewData([])
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Import Data</h1>
        <p className="text-gray-500 mt-1">Import data history stok obat dari file Excel</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <FiInfo className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Format File Fleksibel</h3>
            <p className="text-sm text-blue-600 mt-1">
              Sistem akan otomatis mendeteksi kolom dari file Excel Anda. Pastikan file memiliki kolom untuk:
            </p>
            <ul className="text-sm text-blue-600 mt-2 space-y-1">
              <li>• <strong>Nama Obat</strong> (nama, name, nama_obat, medicine, obat, dll)</li>
              <li>• <strong>Jumlah</strong> (jumlah, qty, quantity, stok, stock, dll)</li>
              <li>• <strong>Tanggal/Bulan/Tahun</strong> (opsional - tanggal, date, bulan, tahun, dll)</li>
              <li>• <strong>Satuan</strong> (opsional - satuan, unit, dll)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <FiUploadCloud className={`w-16 h-16 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-300'}`} />
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Lepaskan file di sini' : 'Drag & drop file Excel di sini'}
            </p>
            <p className="text-gray-500 mt-2">atau klik untuk memilih file</p>
            <p className="text-sm text-gray-400 mt-4">Format: .xlsx, .xls, .csv</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FiFile className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-3">
                  Preview Data ({previewData.length} baris)
                </h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Nama Obat</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Jumlah</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Bulan</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Tahun</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">Satuan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="py-2 px-3">{row.name}</td>
                          <td className="py-2 px-3">{row.quantity}</td>
                          <td className="py-2 px-3">{row.month}</td>
                          <td className="py-2 px-3">{row.year}</td>
                          <td className="py-2 px-3">{row.unit || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Menampilkan 20 dari {previewData.length} baris
                  </p>
                )}
              </div>
            )}

            {/* Import Button */}
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={loading || previewData.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    <span>Mengimport...</span>
                  </>
                ) : (
                  <>
                    <FiUploadCloud className="w-5 h-5" />
                    <span>Import Data</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <FiCheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            ) : (
              <FiAlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            )}
            <div>
              <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Import Berhasil!' : 'Import Gagal'}
              </h3>
              {result.success && (
                <p className="text-green-600 mt-1">
                  {result.imported} data berhasil diimport ke database
                </p>
              )}
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      • {err}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Example Format */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <FiFileText className="w-6 h-6 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">Contoh Format Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-600 border-b">Nama Obat</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 border-b">Jumlah</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 border-b">Tanggal</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 border-b">Satuan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3 border-b">Paracetamol 500mg</td>
                <td className="py-2 px-3 border-b">150</td>
                <td className="py-2 px-3 border-b">01/01/2024</td>
                <td className="py-2 px-3 border-b">Tablet</td>
              </tr>
              <tr>
                <td className="py-2 px-3 border-b">Amoxicillin 500mg</td>
                <td className="py-2 px-3 border-b">200</td>
                <td className="py-2 px-3 border-b">01/02/2024</td>
                <td className="py-2 px-3 border-b">Kapsul</td>
              </tr>
              <tr>
                <td className="py-2 px-3">Vitamin C 1000mg</td>
                <td className="py-2 px-3">100</td>
                <td className="py-2 px-3">01/03/2024</td>
                <td className="py-2 px-3">Tablet</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          <strong>Catatan:</strong> Sistem akan otomatis mendeteksi kolom berdasarkan nama header.
          Anda tidak perlu mengikuti format tertentu, cukup pastikan kolom yang diperlukan ada.
        </p>
      </div>
    </div>
  )
}
