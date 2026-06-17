'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset progress when navigation completes
    setLoading(false)
    setProgress(100)
    
    const timeout = setTimeout(() => {
      setProgress(0)
    }, 200)

    return () => clearTimeout(timeout)
  }, [pathname, searchParams])

  // Listen for navigation start
  useEffect(() => {
    const handleStart = () => {
      setLoading(true)
      setProgress(30)
      
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      return () => clearInterval(interval)
    }

    // Use MutationObserver to detect navigation
    const observer = new MutationObserver(() => {
      handleStart()
    })

    return () => observer.disconnect()
  }, [])

  if (progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: loading ? 1 : 0,
          transition: loading ? 'width 0.3s ease-out' : 'width 0.3s ease-out, opacity 0.3s ease-out'
        }}
      />
    </div>
  )
}
