'use client'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Skeleton Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mt-2 animate-shimmer"></div>
        </div>
      </div>
      
      {/* Skeleton Content */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded animate-shimmer"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-shimmer"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-shimmer"></div>
        </div>
      </div>
    </div>
  )
}
