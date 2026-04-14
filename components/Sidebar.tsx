'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  FiHome,
  FiUpload,
  FiCpu,
  FiTrash2,
  FiLogOut,
  FiMenu,
  FiX,
  FiActivity,
  FiUser,
  FiBell,
  FiChevronRight
} from 'react-icons/fi'

interface SidebarProps {
  notifications: {
    safe: number
    warning: number
    danger: number
  }
}

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Import Data', href: '/dashboard/import', icon: FiUpload },
  { name: 'Prediksi AI', href: '/dashboard/prediction', icon: FiCpu },
  { name: 'Hapus Data', href: '/dashboard/delete', icon: FiTrash2 },
]

export default function Sidebar({ notifications }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const totalNotifications = notifications.warning + notifications.danger

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FiActivity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">PUSKESMAS</span>
          </div>
        </div>
        
        {/* Mobile Notification Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiBell className="w-6 h-6 text-gray-600" />
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center notification-badge">
              {totalNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FiActivity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-base">PUSKESMAS</h1>
                <p className="text-xs text-gray-500">BONTOMANGAPE</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100 relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <FiUser className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-gray-800 text-sm truncate">
                  {(session?.user as any)?.name || (session?.user as any)?.username || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  @{(session?.user as any)?.username || 'user'}
                </p>
              </div>
              <FiChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
            </button>
            
            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <FiLogOut className="w-5 h-5" />
                  <span className="font-medium">Keluar</span>
                </button>
              </div>
            )}
          </div>

          {/* Notification Summary */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiBell className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Status Stok Obat</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center py-1.5 bg-green-100 rounded-lg">
                  <p className="text-base font-bold text-green-600">{notifications.safe}</p>
                  <p className="text-xs text-green-600">Aman</p>
                </div>
                <div className="text-center py-1.5 bg-yellow-100 rounded-lg">
                  <p className="text-base font-bold text-yellow-600">{notifications.warning}</p>
                  <p className="text-xs text-yellow-600">Cek Ulang</p>
                </div>
                <div className="text-center py-1.5 bg-red-100 rounded-lg">
                  <p className="text-base font-bold text-red-600">{notifications.danger}</p>
                  <p className="text-xs text-red-600">Tambah</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`} />
                  <span className={`font-medium ${isActive ? 'text-white' : ''}`}>{item.name}</span>
                  <FiChevronRight className={`w-4 h-4 ml-auto transition-transform ${isActive ? 'text-white' : 'text-gray-400'}`} />
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Notification Panel */}
      {showNotifications && (
        <div className="lg:hidden fixed inset-x-0 top-16 z-50 mx-4 bg-white rounded-xl shadow-xl border border-gray-200 p-4 animate-slide-up">
          <h3 className="font-semibold text-gray-800 mb-3">Status Stok Obat</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-700">Stok Aman</span>
              <span className="font-bold text-green-600">{notifications.safe}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-700">Perlu Dicek Ulang</span>
              <span className="font-bold text-yellow-600">{notifications.warning}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-red-700">Harus Ditambah</span>
              <span className="font-bold text-red-600">{notifications.danger}</span>
            </div>
          </div>
          <button
            onClick={() => setShowNotifications(false)}
            className="mt-3 w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      )}
    </>
  )
}
