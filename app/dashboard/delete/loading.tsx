'use client'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
        <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-shimmer"></div>
      </div>
      <div className="bg-red-50 rounded-xl p-6 animate-shimmer h-40"></div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-200 rounded-2xl animate-shimmer mb-6"></div>
          <div className="h-6 w-48 bg-gray-200 rounded animate-shimmer mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-shimmer"></div>
        </div>
      </div>
    </div>
  )
}
