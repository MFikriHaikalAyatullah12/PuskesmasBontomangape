'use client'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
        <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-shimmer"></div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="h-48 bg-gray-100 rounded-xl animate-shimmer"></div>
      </div>
    </div>
  )
}
