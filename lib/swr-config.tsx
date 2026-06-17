'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  return res.json()
}

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 30000, // 30 seconds - dedupe requests
        errorRetryCount: 2,
        keepPreviousData: true,
        revalidateOnReconnect: true,
        refreshInterval: 0, // No auto refresh
        focusThrottleInterval: 5000,
        loadingTimeout: 3000,
        // Show stale data immediately while revalidating
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
