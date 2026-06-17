'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useTransition } from 'react'
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
  FiChevronDown,
  FiLoader
} from 'react-icons/fi'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Import Data', href: '/dashboard/import', icon: FiUpload },
  { name: 'Prediksi AI', href: '/dashboard/prediction', icon: FiCpu },
  { name: 'Hapus Data', href: '/dashboard/delete', icon: FiTrash2 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [clickedHref, setClickedHref] = useState<string | null>(null)

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-emerald-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            {isOpen ? <FiX className="w-6 h-6 text-emerald-600" /> : <FiMenu className="w-6 h-6 text-emerald-600" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <FiActivity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">UPT PUSKESMAS SUKAMAJU</span>
          </div>
        </div>
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 h-screen shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="px-4 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <FiActivity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm leading-tight">UPT PUSKESMAS SUKAMAJU</h1>
                <p className="text-xs text-emerald-600 font-medium">LUWU UTARA</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100 relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                <FiUser className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {(session?.user as any)?.name || (session?.user as any)?.username || 'User'}
                </p>
                <p className="text-xs text-emerald-600 truncate">
                  @{(session?.user as any)?.username || 'user'}
                </p>
              </div>
              <FiChevronDown className={`w-4 h-4 text-emerald-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
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

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isLoading = isPending && clickedHref === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    setClickedHref(item.href)
                    setIsOpen(false)
                    startTransition(() => {})
                  }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                  } ${isLoading ? 'opacity-70' : ''}`}
                >
                  {isLoading ? (
                    <FiLoader className="w-5 h-5 animate-spin text-emerald-500" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  )}
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

    </>
  )
}
