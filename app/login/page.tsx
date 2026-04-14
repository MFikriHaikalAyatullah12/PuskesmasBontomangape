'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiUser, FiLock, FiLogIn, FiLoader, FiActivity, FiShield, FiTrendingUp, FiDatabase } from 'react-icons/fi'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        // Register
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Registrasi gagal')
        }

        toast.success('Registrasi berhasil! Silakan login.')
        setIsRegister(false)
        setFormData({ ...formData, name: '' })
      } else {
        // Login
        const result = await signIn('credentials', {
          username: formData.username,
          password: formData.password,
          redirect: false
        })

        if (result?.error) {
          throw new Error(result.error)
        }

        toast.success('Login berhasil!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-8">
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25">
              <FiActivity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">PUSKESMAS</h1>
              <p className="text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">BONTOMANGAPE</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl font-bold text-gray-800 leading-tight mb-3">
            Sistem Prediksi<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Kebutuhan Obat</span>
          </h2>
          <p className="text-gray-500 text-base mb-6 leading-relaxed">
            Kelola stok obat dengan cerdas menggunakan prediksi berbasis data untuk memastikan ketersediaan obat yang optimal.
          </p>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                <FiTrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Prediksi Akurat</h3>
                <p className="text-xs text-gray-500">Algoritma ML untuk prediksi kebutuhan</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl">
                <FiDatabase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Manajemen Data</h3>
                <p className="text-xs text-gray-500">Import data dari file Excel dengan mudah</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl">
                <FiShield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Data Terisolasi</h3>
                <p className="text-xs text-gray-500">Setiap akun memiliki data terpisah</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        <div className="relative w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-3">
              <FiActivity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">PUSKESMAS BONTOMANGAPE</h1>
            <p className="text-gray-500 text-sm mt-1">Sistem Prediksi Kebutuhan Obat</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 p-6 sm:p-8 border border-white/80">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isRegister ? 'Buat Akun' : 'Selamat Datang'}
              </h2>
              <p className="text-gray-500 mt-2">
                {isRegister ? 'Daftar untuk mulai menggunakan sistem' : 'Masuk ke akun Anda untuk melanjutkan'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiUser className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                      placeholder="Masukkan nama lengkap"
                      required={isRegister}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiUser className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    placeholder="Masukkan username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                    placeholder="Masukkan password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 mt-2"
              >
                {loading ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <FiLogIn className="w-5 h-5" />
                    <span>{isRegister ? 'Daftar Sekarang' : 'Masuk'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Address */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">Bontorita, Desa Bontomangape, Kec. Galesong</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-4">
            © 2026 PUSKESMAS BONTOMANGAPE
          </p>
        </div>
      </div>
    </div>
  )
}
