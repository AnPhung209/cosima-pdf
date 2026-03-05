export function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-12 bg-gray-200 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-4/5 bg-gray-200 rounded" />
            <div className="h-3 w-3/5 bg-gray-200 rounded" />
          </div>
          <div className="mt-3 flex justify-end">
            <div className="h-7 w-14 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
