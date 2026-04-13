'use client'

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-shimmer"></div>
          <div className="h-4 w-64 bg-gray-200 rounded mt-2 animate-shimmer"></div>
        </div>
        <div className="h-12 w-40 bg-gray-200 rounded-xl animate-shimmer"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="bg-gray-100 rounded-xl p-4 animate-shimmer h-24"></div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="h-[350px] bg-gray-100 rounded-xl animate-shimmer"></div>
      </div>
    </div>
  )
}
