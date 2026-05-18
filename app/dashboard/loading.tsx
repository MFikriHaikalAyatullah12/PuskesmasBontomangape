'use client'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Skeleton Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded mt-2 animate-pulse"></div>
        </div>
      </div>
      
      {/* Skeleton Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-6 w-12 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton Content */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="h-6 w-40 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse mb-6"></div>
        <div className="h-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse"></div>
      </div>
    </div>
  )
}
